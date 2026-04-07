import { Op } from "sequelize";
import { Interview, JobApplication, User, sequelize } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";
import { queueNotificationJob } from "../notification/notification.service.js";
import { canWriteToWorkspace, isWorkspaceMember } from "../workspace/workspace.service.js";

const queueInterviewReminder = async ({
  userId,
  job,
  scheduledAt,
  interviewerNames = null,
  transaction = null
}) => {
  const reminderAt = new Date(new Date(scheduledAt).getTime() - 24 * 60 * 60 * 1000);

  if (reminderAt <= new Date()) {
    return null;
  }

  return queueNotificationJob({
    userId,
    template: "INTERVIEW_REMINDER",
    scheduledFor: reminderAt,
    data: {
      company: job.company_name,
      title: job.job_title,
      scheduledFor: scheduledAt,
      interviewerNames
    },
    metadata: {
      source: "interview-scheduler",
      jobId: job.id
    },
    transaction
  });
};

const queueStatusAlert = async ({
  userId,
  job,
  previousStatus,
  nextStatus,
  transaction = null
}) => {
  return queueNotificationJob({
    userId,
    template: "STATUS_CHANGE_ALERT",
    data: {
      company: job.company_name,
      title: job.job_title,
      previousStatus,
      status: nextStatus
    },
    metadata: {
      source: "interview-outcome",
      jobId: job.id
    },
    transaction
  });
};

export const scheduleInterviewService = async (actor, data) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  return sequelize.transaction(async (transaction) => {
    const job = await JobApplication.findByPk(data.job_id, {
      transaction
    });

    if (!job) {
      throw new AppError("Job application not found", 404);
    }

    const isOwner = job.user_id === userId;
    if (!isOwner) {
      if (!job.workspace_id) {
        throw new AppError("Access denied to interview schedule for this job", 403);
      }

      const canWrite = await canWriteToWorkspace(job.workspace_id, actor);
      if (!canWrite) {
        throw new AppError("Write access denied to workspace", 403);
      }
    }

    const interview = await Interview.create(
      {
        ...data,
        user_id: job.user_id,
        interviewer_names: data.interviewer_names || null
      },
      { transaction }
    );

    if (!["Interviewing", "Technical Test", "Final Round"].includes(job.status)) {
      const previousStatus = job.status;
      await job.update({ status: "Interviewing" }, { transaction, actorId: userId });
      await queueStatusAlert({
        userId,
        job,
        previousStatus,
        nextStatus: "Interviewing",
        transaction
      });
    }

    await queueInterviewReminder({
      userId,
      job,
      scheduledAt: data.scheduled_at,
      interviewerNames: data.interviewer_names || null,
      transaction
    });

    return interview;
  });
};

export const getInterviewsService = async (actor, query = {}) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const where = {};
  const includeWhere = {};
  const workspaceId = Number(query.workspace_id);
  const hasWorkspaceFilter = Number.isInteger(workspaceId) && workspaceId > 0;

  if (hasWorkspaceFilter) {
    const member = await isWorkspaceMember(workspaceId, actor);
    if (!member) {
      throw new AppError("Access denied to workspace", 403);
    }
    includeWhere.workspace_id = workspaceId;
  } else {
    where.user_id = userId;
  }

  if (query.upcoming === "true") {
    where.scheduled_at = { [Op.gte]: new Date() };
  }

  if (query.status) {
    where.status = query.status;
  }

  const pagination = resolvePagePagination(query, {
    defaultLimit: 100,
    maxLimit: 500
  });

  const interviewQuery = {
    where,
    include: [
      {
        model: JobApplication,
        attributes: ["id", "company_name", "job_title", "status", "workspace_id", "user_id"],
        where: includeWhere,
        required: hasWorkspaceFilter,
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"]
          }
        ]
      },
      {
        model: User,
        attributes: ["id", "name", "email"]
      }
    ],
    order: [["scheduled_at", "ASC"]]
  };

  if (pagination.enabled) {
    const result = await Interview.findAndCountAll({
      ...interviewQuery,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPageResult(result.rows, result.count, pagination);
  }

  return Interview.findAll(interviewQuery);
};

const assertInterviewAccess = async (interview, actor, write = false) => {
  const actorId = actor?.id;
  if (!actorId) {
    throw new AppError("Unauthorized access.", 401);
  }

  if (!interview) {
    throw new AppError("Interview not found", 404);
  }

  if (interview.user_id === actorId) {
    return;
  }

  const workspaceId = interview.JobApplication?.workspace_id || null;
  if (!workspaceId) {
    throw new AppError("Access denied to this interview", 403);
  }

  const allowed = write
    ? await canWriteToWorkspace(workspaceId, actor)
    : await isWorkspaceMember(workspaceId, actor);

  if (!allowed) {
    throw new AppError(write ? "Write access denied to workspace interview" : "Access denied to workspace interview", 403);
  }
};

export const updateInterviewService = async (actor, interviewId, data) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  return sequelize.transaction(async (transaction) => {
    const interview = await Interview.findByPk(interviewId, {
      include: [
        {
          model: JobApplication,
          attributes: ["id", "workspace_id", "user_id", "company_name", "job_title", "status"]
        }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    await assertInterviewAccess(interview, actor, true);

    const updated = await interview.update(data, { transaction });

    if (data.scheduled_at) {
      const job = interview.JobApplication || await JobApplication.findByPk(interview.job_id, { transaction });
      if (job) {
        await queueInterviewReminder({
          userId: job.user_id,
          job,
          scheduledAt: data.scheduled_at,
          interviewerNames: data.interviewer_names || interview.interviewer_names || null,
          transaction
        });
      }
    }

    return updated;
  });
};

export const recordInterviewOutcomeService = async (actor, interviewId, outcome, feedback) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  return sequelize.transaction(async (transaction) => {
    const interview = await Interview.findByPk(interviewId, {
      include: [
        {
          model: JobApplication,
          attributes: ["id", "workspace_id", "user_id", "company_name", "job_title", "status"]
        }
      ],
      transaction
    });

    await assertInterviewAccess(interview, actor, true);

    const updatedInterview = await interview.update(
      {
        outcome,
        feedback,
        status: "completed"
      },
      { transaction }
    );

    const job = interview.JobApplication || await JobApplication.findByPk(interview.job_id, { transaction });

    if (job) {
      if (outcome === "passed") {
        const previousStatus = job.status;
        const nextStatus = job.status === "Final Round" ? "Offer" : "Final Round";
        await job.update({ status: nextStatus }, { transaction, actorId: userId });
        await queueStatusAlert({
          userId: job.user_id,
          job,
          previousStatus,
          nextStatus,
          transaction
        });
      }

      if (outcome === "failed") {
        const previousStatus = job.status;
        await job.update({ status: "Rejected" }, { transaction, actorId: userId });
        await queueStatusAlert({
          userId: job.user_id,
          job,
          previousStatus,
          nextStatus: "Rejected",
          transaction
        });
      }
    }

    return updatedInterview;
  });
};

export const getInterviewWorkspaceBoardService = async (actor, query = {}) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const workspaceId = Number(query.workspace_id);
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    throw new AppError("workspace_id must be a positive integer", 400);
  }

  const member = await isWorkspaceMember(workspaceId, actor);
  if (!member) {
    throw new AppError("Access denied to workspace", 403);
  }

  const days = Math.max(1, Math.min(60, Number(query.days) || 14));
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const interviews = await Interview.findAll({
    where: {
      scheduled_at: {
        [Op.gte]: start,
        [Op.lte]: end
      }
    },
    include: [
      {
        model: JobApplication,
        attributes: ["id", "company_name", "job_title", "status", "workspace_id", "user_id"],
        where: { workspace_id: workspaceId },
        required: true,
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"]
          }
        ]
      }
    ],
    order: [["scheduled_at", "ASC"]]
  });

  const byDay = {};
  const stageStats = {};

  for (const interview of interviews) {
    const dayKey = new Date(interview.scheduled_at).toISOString().slice(0, 10);
    if (!byDay[dayKey]) {
      byDay[dayKey] = [];
    }
    byDay[dayKey].push(interview);

    const stage = interview.JobApplication?.status || "Unknown";
    stageStats[stage] = (stageStats[stage] || 0) + 1;
  }

  return {
    workspace_id: workspaceId,
    from: start.toISOString(),
    to: end.toISOString(),
    totalInterviews: interviews.length,
    stageStats,
    days: Object.entries(byDay).map(([date, items]) => ({
      date,
      count: items.length,
      items
    }))
  };
};
