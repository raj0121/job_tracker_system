import { QueryTypes } from "sequelize";
import {
  AuditLog,
  Interview,
  JobApplication,
  JobStatusHistory,
  User,
  sequelize
} from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { isSuperAdminRole } from "../../utils/role.js";
import { isWorkspaceMember } from "../workspace/workspace.service.js";
import { attachQuerySource } from "../../utils/querySource.js";

const TERMINAL_STATUSES = new Set(["Hired", "Rejected"]);

const toHours = (fromMs, toMs) => Number((Math.max(0, toMs - fromMs) / (1000 * 60 * 60)).toFixed(2));

const resolveSla = (statusHistoryRows = [], createdAt) => {
  const stageMap = {};
  const stageTimeline = [];
  const now = Date.now();
  let terminalAt = null;

  for (let index = 0; index < statusHistoryRows.length; index += 1) {
    const current = statusHistoryRows[index];
    const next = statusHistoryRows[index + 1];
    const enteredAtMs = new Date(current.changed_at).getTime();
    const exitedAtMs = next ? new Date(next.changed_at).getTime() : now;
    const hoursInStage = toHours(enteredAtMs, exitedAtMs);

    stageTimeline.push({
      status: current.to_status,
      enteredAt: current.changed_at,
      exitedAt: next ? next.changed_at : null,
      hoursInStage,
      isCurrent: !next
    });

    if (!stageMap[current.to_status]) {
      stageMap[current.to_status] = {
        totalHours: 0,
        maxHours: 0,
        transitions: 0
      };
    }

    stageMap[current.to_status].totalHours += hoursInStage;
    stageMap[current.to_status].maxHours = Math.max(stageMap[current.to_status].maxHours, hoursInStage);
    stageMap[current.to_status].transitions += 1;

    if (!terminalAt && TERMINAL_STATUSES.has(current.to_status)) {
      terminalAt = current.changed_at;
    }
  }

  const stageBreakdown = Object.entries(stageMap).map(([status, value]) => ({
    status,
    totalHours: Number(value.totalHours.toFixed(2)),
    avgHours: Number((value.totalHours / value.transitions).toFixed(2)),
    maxHours: Number(value.maxHours.toFixed(2)),
    transitions: value.transitions
  })).sort((first, second) => second.totalHours - first.totalHours);

  const createdAtMs = new Date(createdAt).getTime();
  const lifecycleEndMs = terminalAt ? new Date(terminalAt).getTime() : now;

  return {
    stageBreakdown,
    timeline: stageTimeline,
    totalLifecycleHours: toHours(createdAtMs, lifecycleEndMs),
    currentStageHours: stageTimeline.length ? stageTimeline[stageTimeline.length - 1].hoursInStage : 0,
    terminalAt
  };
};

const parseNumeric = (value) => Number(value || 0);
const withSource = (sql, source) => attachQuerySource(sql, source);
const buildUserFilterSql = (userIds, alias = "ja") => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return "";
  }
  return `AND ${alias}.user_id IN (:userIds)`;
};

const assertTimelineAccess = async (job, actor) => {
  if (isSuperAdminRole(actor.role)) {
    return;
  }

  if (job.user_id === actor.id) {
    return;
  }

  if (job.workspace_id) {
    const member = await isWorkspaceMember(job.workspace_id, actor);
    if (member) {
      return;
    }
  }

  throw new AppError("Access denied", 403);
};

export const getJobTimelineService = async (jobId, actor) => {
  const job = await JobApplication.findByPk(jobId, {
    attributes: [
      "id",
      "user_id",
      "workspace_id",
      "company_name",
      "job_title",
      "status",
      "createdAt",
      "updatedAt"
    ]
  });

  if (!job) {
    throw new AppError("Job not found", 404);
  }

  await assertTimelineAccess(job, actor);

  const [statusHistory, interviews, updateLogs] = await Promise.all([
    JobStatusHistory.findAll({
      where: { job_id: job.id },
      attributes: ["id", "job_id", "user_id", "from_status", "to_status", "changed_at"],
      order: [["changed_at", "ASC"]],
      raw: true
    }),
    Interview.findAll({
      where: { job_id: job.id },
      attributes: [
        "id",
        "scheduled_at",
        "status",
        "outcome",
        "duration_minutes",
        "location_type",
        "interviewer_names",
        "createdAt",
        "updatedAt"
      ],
      order: [["scheduled_at", "ASC"]],
      raw: true
    }),
    AuditLog.findAll({
      where: {
        resource: "JobApplication",
        resource_id: job.id,
        action: "UPDATE_JOB"
      },
      include: [{ model: User, attributes: ["id", "name", "email"] }],
      order: [["createdAt", "ASC"]]
    })
  ]);

  const statusActorIds = [...new Set(statusHistory.map((item) => item.user_id).filter(Boolean))];
  const statusActors = statusActorIds.length
    ? await User.findAll({
      where: { id: statusActorIds },
      attributes: ["id", "name", "email"],
      raw: true
    })
    : [];

  const actorMap = statusActors.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const events = [
    {
      event_type: "CREATED",
      event_time: job.createdAt,
      label: "Job created",
      details: {
        company: job.company_name,
        title: job.job_title,
        initialStatus: statusHistory[0]?.to_status || job.status
      }
    }
  ];

  for (const row of statusHistory) {
    const changedBy = actorMap[row.user_id] || null;
    events.push({
      event_type: "STATUS_CHANGED",
      event_time: row.changed_at,
      label: `Status changed ${row.from_status} -> ${row.to_status}`,
      details: {
        from: row.from_status,
        to: row.to_status,
        changedBy
      }
    });

    if (row.to_status === "Offer") {
      events.push({
        event_type: "OFFER_MILESTONE",
        event_time: row.changed_at,
        label: "Offer reached",
        details: {
          changedBy
        }
      });
    }
  }

  for (const interview of interviews) {
    events.push({
      event_type: "INTERVIEW",
      event_time: interview.scheduled_at,
      label: "Interview scheduled",
      details: {
        interviewId: interview.id,
        status: interview.status,
        outcome: interview.outcome,
        durationMinutes: interview.duration_minutes,
        locationType: interview.location_type,
        interviewerNames: interview.interviewer_names
      }
    });
  }

  for (const log of updateLogs) {
    events.push({
      event_type: "UPDATED",
      event_time: log.createdAt,
      label: "Job updated",
      details: {
        actor: log.User ? { id: log.User.id, name: log.User.name, email: log.User.email } : null,
        action: log.action
      }
    });
  }

  events.sort((first, second) => new Date(first.event_time).getTime() - new Date(second.event_time).getTime());

  const sla = resolveSla(statusHistory, job.createdAt);

  const firstInterviewEvent = interviews[0] || null;
  const firstOfferEvent = statusHistory.find((item) => item.to_status === "Offer") || null;

  return {
    jobId: Number(jobId),
    lifecycle: {
      createdAt: job.createdAt,
      lastUpdatedAt: job.updatedAt,
      currentStatus: job.status,
      firstInterviewAt: firstInterviewEvent?.scheduled_at || null,
      firstOfferAt: firstOfferEvent?.changed_at || null,
      isTerminal: TERMINAL_STATUSES.has(job.status),
      totalLifecycleHours: sla.totalLifecycleHours,
      currentStageHours: sla.currentStageHours
    },
    events,
    sla: {
      stageBreakdown: sla.stageBreakdown,
      timeline: sla.timeline,
      totalLifecycleHours: sla.totalLifecycleHours,
      currentStageHours: sla.currentStageHours
    }
  };
};

export const getCareerTimelineService = async (actor, options = {}) => {
  const days = Math.max(30, Math.min(730, parseInt(options.days, 10) || 180));
  const limit = Math.max(50, Math.min(500, parseInt(options.limit, 10) || 220));
  const parsedWorkspaceId = Number(options.workspaceId || options.workspace_id || 0);
  const workspaceId = Number.isInteger(parsedWorkspaceId) && parsedWorkspaceId > 0 ? parsedWorkspaceId : null;

  const replacements = {
    userId: actor.id,
    days,
    limit,
    ...(workspaceId ? { workspaceId } : {})
  };

  const workspaceFilterJa = workspaceId ? "AND ja.workspace_id = :workspaceId" : "AND ja.workspace_id IS NULL";
  const workspaceFilterJsh = workspaceId ? "AND ja.workspace_id = :workspaceId" : "AND ja.workspace_id IS NULL";
  const workspaceFilterInterview = workspaceId ? "AND ja.workspace_id = :workspaceId" : "AND ja.workspace_id IS NULL";

  const [createdRows, statusRows, interviewRows, milestoneRows, stageRows, monthlyRows, upcomingRows] = await Promise.all([
    sequelize.query(
      withSource(
        `
        SELECT
          ja.id AS job_id,
          ja.company_name,
          ja.job_title,
          ja.status,
          ja.createdAt AS event_time
        FROM job_applications ja
        WHERE ja.user_id = :userId
          AND ja.createdAt >= DATE_SUB(NOW(), INTERVAL :days DAY)
          AND ja.deletedAt IS NULL
          ${workspaceFilterJa}
        ORDER BY ja.createdAt DESC
        LIMIT :limit
      `,
        "timeline.career.created"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          jsh.id,
          jsh.job_id,
          jsh.from_status,
          jsh.to_status,
          jsh.changed_at AS event_time,
          ja.company_name,
          ja.job_title
        FROM job_status_histories jsh
        INNER JOIN job_applications ja ON ja.id = jsh.job_id
        WHERE ja.user_id = :userId
          AND jsh.changed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          AND ja.deletedAt IS NULL
          ${workspaceFilterJsh}
        ORDER BY jsh.changed_at DESC
        LIMIT :limit
      `,
        "timeline.career.status_changes"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          i.id,
          i.job_id,
          i.scheduled_at AS event_time,
          i.status,
          i.outcome,
          i.location_type,
          i.interviewer_names,
          ja.company_name,
          ja.job_title
        FROM interviews i
        INNER JOIN job_applications ja ON ja.id = i.job_id
        WHERE i.user_id = :userId
          AND i.scheduled_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          AND ja.deletedAt IS NULL
          ${workspaceFilterInterview}
        ORDER BY i.scheduled_at DESC
        LIMIT :limit
      `,
        "timeline.career.interviews"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          MIN(ja.createdAt) AS first_application_at,
          MIN(first_interview.first_interview_at) AS first_interview_at,
          MIN(first_offer.first_offer_at) AS first_offer_at,
          MIN(first_hired.first_hired_at) AS first_hired_at
        FROM job_applications ja
        LEFT JOIN (
          SELECT job_id, MIN(scheduled_at) AS first_interview_at
          FROM interviews
          GROUP BY job_id
        ) first_interview ON first_interview.job_id = ja.id
        LEFT JOIN (
          SELECT job_id, MIN(changed_at) AS first_offer_at
          FROM job_status_histories
          WHERE to_status = 'Offer'
          GROUP BY job_id
        ) first_offer ON first_offer.job_id = ja.id
        LEFT JOIN (
          SELECT job_id, MIN(changed_at) AS first_hired_at
          FROM job_status_histories
          WHERE to_status = 'Hired'
          GROUP BY job_id
        ) first_hired ON first_hired.job_id = ja.id
        WHERE ja.user_id = :userId
          AND ja.deletedAt IS NULL
          ${workspaceFilterJa}
      `,
        "timeline.career.milestones"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          staged.status,
          COUNT(*) AS transitions,
          ROUND(AVG(staged.hours_in_stage), 2) AS avg_hours
        FROM (
          SELECT
            jsh.to_status AS status,
            GREATEST(
              0,
              TIMESTAMPDIFF(
                HOUR,
                jsh.changed_at,
                COALESCE(
                  (
                    SELECT MIN(next_change.changed_at)
                    FROM job_status_histories next_change
                    WHERE next_change.job_id = jsh.job_id
                      AND (
                        next_change.changed_at > jsh.changed_at
                        OR (next_change.changed_at = jsh.changed_at AND next_change.id > jsh.id)
                      )
                  ),
                  NOW()
                )
              )
            ) AS hours_in_stage
          FROM job_status_histories jsh
          INNER JOIN job_applications ja ON ja.id = jsh.job_id
          WHERE ja.user_id = :userId
            AND ja.deletedAt IS NULL
            ${workspaceFilterJsh}
        ) AS staged
        GROUP BY staged.status
        ORDER BY transitions DESC
      `,
        "timeline.career.stage_duration"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          DATE_FORMAT(jsh.changed_at, '%Y-%m') AS month,
          SUM(CASE WHEN jsh.to_status IN ('Screening','Interviewing','Technical Test','Final Round') THEN 1 ELSE 0 END) AS interview_stages,
          SUM(CASE WHEN jsh.to_status = 'Offer' THEN 1 ELSE 0 END) AS offers,
          SUM(CASE WHEN jsh.to_status = 'Hired' THEN 1 ELSE 0 END) AS hired
        FROM job_status_histories jsh
        INNER JOIN job_applications ja ON ja.id = jsh.job_id
        WHERE ja.user_id = :userId
          AND jsh.changed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          AND ja.deletedAt IS NULL
          ${workspaceFilterJsh}
        GROUP BY month
        ORDER BY month ASC
      `,
        "timeline.career.monthly_progress"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          i.id,
          i.job_id,
          i.scheduled_at,
          i.status,
          i.outcome,
          i.location_type,
          i.interviewer_names,
          ja.company_name,
          ja.job_title
        FROM interviews i
        INNER JOIN job_applications ja ON ja.id = i.job_id
        WHERE i.user_id = :userId
          AND i.scheduled_at >= NOW()
          AND i.scheduled_at < DATE_ADD(NOW(), INTERVAL 30 DAY)
          AND ja.deletedAt IS NULL
          ${workspaceFilterInterview}
        ORDER BY i.scheduled_at ASC
        LIMIT 30
      `,
        "timeline.career.upcoming_interviews"
      ),
      { replacements, type: QueryTypes.SELECT }
    )
  ]);

  const mergedEvents = [
    ...createdRows.map((item) => ({
      eventType: "CREATED",
      eventTime: item.event_time,
      jobId: parseNumeric(item.job_id),
      company: item.company_name,
      title: item.job_title,
      status: item.status,
      description: `Applied for ${item.job_title} at ${item.company_name}`
    })),
    ...statusRows.map((item) => ({
      eventType: "STATUS_CHANGED",
      eventTime: item.event_time,
      jobId: parseNumeric(item.job_id),
      company: item.company_name,
      title: item.job_title,
      status: item.to_status,
      description: `${item.from_status} -> ${item.to_status}`
    })),
    ...interviewRows.map((item) => ({
      eventType: "INTERVIEW",
      eventTime: item.event_time,
      jobId: parseNumeric(item.job_id),
      company: item.company_name,
      title: item.job_title,
      status: item.status,
      description: `Interview (${item.location_type}) outcome: ${item.outcome}`,
      metadata: {
        interviewerNames: item.interviewer_names
      }
    }))
  ]
    .sort((first, second) => new Date(second.eventTime).getTime() - new Date(first.eventTime).getTime())
    .slice(0, limit);

  const milestone = milestoneRows[0] || {};

  const kpi = {
    eventsTracked: mergedEvents.length,
    interviewsTracked: interviewRows.length,
    statusTransitions: statusRows.length,
    upcomingInterviews: upcomingRows.length
  };

  return {
    windowDays: days,
    workspaceId,
    milestone: {
      firstApplicationAt: milestone.first_application_at || null,
      firstInterviewAt: milestone.first_interview_at || null,
      firstOfferAt: milestone.first_offer_at || null,
      firstHiredAt: milestone.first_hired_at || null
    },
    stageDuration: stageRows.map((item) => ({
      status: item.status,
      transitions: parseNumeric(item.transitions),
      avgHours: parseNumeric(item.avg_hours)
    })),
    monthlyProgress: monthlyRows.map((item) => ({
      month: item.month,
      interviewStages: parseNumeric(item.interview_stages),
      offers: parseNumeric(item.offers),
      hired: parseNumeric(item.hired)
    })),
    upcomingInterviews: upcomingRows.map((item) => ({
      id: parseNumeric(item.id),
      jobId: parseNumeric(item.job_id),
      scheduledAt: item.scheduled_at,
      status: item.status,
      outcome: item.outcome,
      locationType: item.location_type,
      interviewerNames: item.interviewer_names,
      company: item.company_name,
      title: item.job_title
    })),
    kpi,
    events: mergedEvents
  };
};

export const getAdminStateChangesService = async (query = {}, scope = {}) => {
  const days = Math.max(1, Math.min(365, parseInt(query.days, 10) || 30));
  const limit = Math.max(10, Math.min(500, parseInt(query.limit, 10) || 100));

  const replacements = { days, limit, userIds: scope.userIds || [] };
  const jobUserFilter = buildUserFilterSql(scope.userIds, "ja");

  const [recentChanges, statusSummaryRows, slaRows] = await Promise.all([
    sequelize.query(
      withSource(
        `
        SELECT
          jsh.id,
          jsh.job_id,
          jsh.changed_at,
          jsh.from_status,
          jsh.to_status,
          jsh.user_id AS changed_by_user_id,
          COALESCE(changer.name, 'Unknown') AS changed_by_name,
          ja.job_title,
          ja.company_name,
          ja.status AS current_status,
          ja.workspace_id,
          owner.id AS owner_user_id,
          COALESCE(owner.name, 'Unknown') AS owner_name
        FROM job_status_histories jsh
        INNER JOIN job_applications ja ON ja.id = jsh.job_id AND ja.deletedAt IS NULL
        LEFT JOIN users changer ON changer.id = jsh.user_id
        LEFT JOIN users owner ON owner.id = ja.user_id
        WHERE jsh.changed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          ${jobUserFilter}
        ORDER BY jsh.changed_at DESC
        LIMIT :limit
      `,
        "timeline.admin.recent_changes"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          to_status AS status,
          COUNT(*) AS total
        FROM job_status_histories jsh
        INNER JOIN job_applications ja ON ja.id = jsh.job_id AND ja.deletedAt IS NULL
        WHERE jsh.changed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
          ${jobUserFilter}
        GROUP BY to_status
        ORDER BY total DESC
      `,
        "timeline.admin.status_summary"
      ),
      { replacements, type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          staged.status,
          COUNT(*) AS transitions,
          ROUND(AVG(staged.hours_in_stage), 2) AS avg_hours,
          ROUND(MAX(staged.hours_in_stage), 2) AS max_hours,
          ROUND(SUM(staged.hours_in_stage), 2) AS total_hours
        FROM (
          SELECT
            jsh.to_status AS status,
            GREATEST(
              0,
              TIMESTAMPDIFF(
                HOUR,
                jsh.changed_at,
                COALESCE(
                  (
                    SELECT MIN(next_change.changed_at)
                    FROM job_status_histories next_change
                    WHERE next_change.job_id = jsh.job_id
                      AND (
                        next_change.changed_at > jsh.changed_at
                        OR (next_change.changed_at = jsh.changed_at AND next_change.id > jsh.id)
                      )
                  ),
                  NOW()
                )
              )
            ) AS hours_in_stage
          FROM job_status_histories jsh
          INNER JOIN job_applications ja ON ja.id = jsh.job_id AND ja.deletedAt IS NULL
          WHERE jsh.changed_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
            ${jobUserFilter}
        ) AS staged
        GROUP BY staged.status
        ORDER BY transitions DESC
      `,
        "timeline.admin.sla_summary"
      ),
      { replacements, type: QueryTypes.SELECT }
    )
  ]);

  const statusSummary = statusSummaryRows.map((item) => ({
    status: item.status,
    total: parseNumeric(item.total)
  }));

  const totalChanges = statusSummary.reduce((sum, item) => sum + item.total, 0);
  const offerChanges = statusSummary.find((item) => item.status === "Offer")?.total || 0;

  return {
    windowDays: days,
    totalChanges,
    offerChanges,
    statusSummary,
    recentChanges: recentChanges.map((item) => ({
      ...item,
      id: parseNumeric(item.id),
      job_id: parseNumeric(item.job_id),
      changed_by_user_id: parseNumeric(item.changed_by_user_id),
      owner_user_id: parseNumeric(item.owner_user_id),
      workspace_id: item.workspace_id ? parseNumeric(item.workspace_id) : null
    })),
    slaByStage: slaRows.map((item) => ({
      status: item.status,
      transitions: parseNumeric(item.transitions),
      avgHours: parseNumeric(item.avg_hours),
      maxHours: parseNumeric(item.max_hours),
      totalHours: parseNumeric(item.total_hours)
    }))
  };
};
