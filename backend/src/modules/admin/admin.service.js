import { Op, QueryTypes } from "sequelize";
import {
  AuditLog,
  Candidate,
  Company,
  Contact,
  Document,
  Enquiry,
  Interview,
  JobApplication,
  JobStatusHistory,
  LoginHistory,
  QueueJob,
  Tenant,
  User,
  Role,
  Requirement,
  Workspace,
  WorkspaceMember,
  sequelize
} from "../../models/index.js";
import { metrics } from "../../utils/metrics.js";
import { getCacheHealth, getCachedData, setCachedData } from "../../utils/cache.js";
import { attachQuerySource } from "../../utils/querySource.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";
import { isSuperAdminRole, normalizeRole } from "../../utils/role.js";
import { AppError } from "../../utils/AppError.js";

const toNumber = (value) => Number(value || 0);
const toRatio = (numerator, denominator) =>
  denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
const withSource = (sql, source) => attachQuerySource(sql, source);

export const resolveAdminScope = async (actor) => {
  if (!actor) {
    return { userIds: null, tenantId: null, isSuperAdmin: false };
  }

  const superAdmin = isSuperAdminRole(actor.role);
  if (superAdmin || !actor.tenant_id) {
    return { userIds: null, tenantId: actor.tenant_id || null, isSuperAdmin: superAdmin };
  }

  const users = await User.findAll({
    where: { tenant_id: actor.tenant_id },
    attributes: ["id"],
    raw: true
  });

  const userIds = users.map((user) => user.id);

  return {
    userIds: userIds.length ? userIds : [0],
    tenantId: actor.tenant_id,
    isSuperAdmin: false
  };
};

const buildUserWhere = (userIds, field = "user_id") => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return {};
  }
  return { [field]: { [Op.in]: userIds } };
};

const buildUserFilterSql = (userIds, alias = null, field = "user_id") => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return "";
  }
  const prefix = alias ? `${alias}.` : "";
  return `AND ${prefix}${field} IN (:userIds)`;
};

const buildWorkspaceWhere = (workspaceId) => {
  if (!workspaceId) {
    return {};
  }

  return { workspace_id: workspaceId };
};

const buildWorkspaceFilterSql = (workspaceId, alias = null, field = "workspace_id") => {
  if (!workspaceId) {
    return "";
  }

  const prefix = alias ? `${alias}.` : "";
  return `AND ${prefix}${field} = :workspaceId`;
};

const normalizeOptionalId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const resolveAnalyticsScope = async (actor, query = {}) => {
  const baseScope = await resolveAdminScope(actor);
  const requestedTenantId = normalizeOptionalId(query.tenant_id);
  const requestedWorkspaceId = normalizeOptionalId(query.workspace_id);

  if (!baseScope.isSuperAdmin) {
    return {
      ...baseScope,
      workspaceId: requestedWorkspaceId
    };
  }

  if (!requestedTenantId) {
    return {
      ...baseScope,
      workspaceId: requestedWorkspaceId
    };
  }

  const users = await User.findAll({
    where: { tenant_id: requestedTenantId },
    attributes: ["id"],
    raw: true
  });

  return {
    userIds: users.map((user) => user.id),
    tenantId: requestedTenantId,
    isSuperAdmin: true,
    workspaceId: requestedWorkspaceId
  };
};

export const getGlobalStatsService = async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const cacheKey = "admin:dashboard:superadmin-ats";
  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const [
    totalCandidates,
    totalRequirements,
    totalEnquiries,
    totalCompanies,
    totalUsers,
    activeToday,
    requirementStatusRows,
    urgentRequirements,
    candidatePipelineRows,
    candidateTrendRows,
    enquirySourceRows,
    convertedEnquiryRows,
    topSourceRows,
    topLocationRows,
    requirementKeywordRows,
    companyHiringRows,
    activeCompanyRows,
    requirementCompanyRows,
    candidateCompanyRows,
    recruiterRows,
    queueRows
  ] = await Promise.all([
    Candidate.count(),
    Requirement.count(),
    Enquiry.count(),
    Company.count(),
    User.count(),
    LoginHistory.count({
      where: {
        createdAt: { [Op.gte]: todayStart },
        status: "success"
      },
      distinct: true,
      col: "user_id"
    }),
    Requirement.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true
    }),
    Requirement.count({
      where: { priority: "urgent" }
    }),
    sequelize.query(
      withSource(
        `
        SELECT
          COUNT(*) AS applied,
          SUM(CASE WHEN status IN ('Screening', 'Interviewing', 'Technical Test', 'Final Round', 'Offer', 'Hired') THEN 1 ELSE 0 END) AS screening,
          SUM(CASE WHEN status IN ('Interviewing', 'Technical Test', 'Final Round', 'Offer', 'Hired') THEN 1 ELSE 0 END) AS interview,
          SUM(CASE WHEN status IN ('Offer', 'Hired') THEN 1 ELSE 0 END) AS offer,
          SUM(CASE WHEN status = 'Hired' THEN 1 ELSE 0 END) AS hired,
          AVG(CASE WHEN status = 'Hired' THEN TIMESTAMPDIFF(DAY, createdAt, updatedAt) END) AS avgTimeToHire
        FROM job_applications
        WHERE deletedAt IS NULL
      `,
        "admin.dashboard.candidate_pipeline"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          DATE_FORMAT(createdAt, '%Y-%m') AS month,
          COUNT(*) AS candidates,
          SUM(CASE WHEN status = 'Hired' THEN 1 ELSE 0 END) AS hires
        FROM job_applications
        WHERE deletedAt IS NULL
          AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
      `,
        "admin.dashboard.candidate_monthly_trend"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(enquiry_source, 'Unknown') AS label,
          COUNT(*) AS value
        FROM enquiries
        GROUP BY enquiry_source
        ORDER BY value DESC
        LIMIT 8
      `,
        "admin.dashboard.enquiry_sources"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT COUNT(DISTINCT e.id) AS converted
        FROM enquiries e
        INNER JOIN candidates c
          ON (
            (e.email IS NOT NULL AND c.email IS NOT NULL AND LOWER(e.email) = LOWER(c.email))
            OR (e.contact_number IS NOT NULL AND c.phone IS NOT NULL AND e.contact_number = c.phone)
          )
      `,
        "admin.dashboard.converted_enquiries"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(source, 'Unknown') AS label,
          COUNT(*) AS value
        FROM candidates
        GROUP BY source
        ORDER BY value DESC
        LIMIT 8
      `,
        "admin.dashboard.top_sources"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(city, 'Unknown') AS label,
          COUNT(*) AS value
        FROM requirements
        GROUP BY city
        ORDER BY value DESC
        LIMIT 8
      `,
        "admin.dashboard.top_locations"
      ),
      { type: QueryTypes.SELECT }
    ),
    Requirement.findAll({
      attributes: ["keywords"],
      raw: true
    }),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(c.name, ja.company_name, 'Unknown') AS label,
          SUM(CASE WHEN ja.status = 'Hired' THEN 1 ELSE 0 END) AS hires
        FROM job_applications ja
        LEFT JOIN companies c ON c.id = ja.company_id
        WHERE ja.deletedAt IS NULL
        GROUP BY label
        HAVING hires > 0
        ORDER BY hires DESC
        LIMIT 8
      `,
        "admin.dashboard.top_hiring_companies"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(NULLIF(TRIM(client_name), ''), 'Unknown') AS label,
          COUNT(*) AS openJobs
        FROM requirements
        WHERE status = 'open'
        GROUP BY label
        ORDER BY openJobs DESC
        LIMIT 8
      `,
        "admin.dashboard.active_companies"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(c.id, 0) AS companyId,
          COALESCE(c.name, NULLIF(TRIM(r.client_name), ''), 'Unknown') AS label,
          COUNT(*) AS requirements
        FROM requirements r
        LEFT JOIN companies c ON c.id = r.company_id
        GROUP BY companyId, label
        ORDER BY requirements DESC
        LIMIT 8
      `,
        "admin.dashboard.requirements_by_company"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COALESCE(c.id, 0) AS companyId,
          COALESCE(c.name, NULLIF(TRIM(r.client_name), ''), 'Unknown') AS label,
          COUNT(*) AS candidates
        FROM candidates cand
        INNER JOIN requirements r ON r.id = cand.requirement_id
        LEFT JOIN companies c ON c.id = r.company_id
        GROUP BY companyId, label
        ORDER BY candidates DESC
        LIMIT 8
      `,
        "admin.dashboard.candidates_by_company"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          u.id,
          u.name,
          u.role,
          COUNT(ja.id) AS jobsHandled,
          SUM(CASE WHEN ja.status IN ('Interviewing', 'Technical Test', 'Final Round', 'Offer', 'Hired') THEN 1 ELSE 0 END) AS interviews,
          SUM(CASE WHEN ja.status = 'Hired' THEN 1 ELSE 0 END) AS hires
        FROM users u
        LEFT JOIN job_applications ja ON ja.user_id = u.id AND ja.deletedAt IS NULL
        WHERE u.role IN ('recruiter', 'hr', 'admin')
        GROUP BY u.id, u.name, u.role
        ORDER BY hires DESC, jobsHandled DESC
      `,
        "admin.dashboard.recruiter_performance"
      ),
      { type: QueryTypes.SELECT }
    ),
    QueueJob.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true
    })
  ]);

  const requirementStatusMap = requirementStatusRows.reduce((acc, row) => {
    acc[row.status] = toNumber(row.count);
    return acc;
  }, {});

  const queueStatusMap = queueRows.reduce((acc, row) => {
    acc[row.status] = toNumber(row.count);
    return acc;
  }, {});

  const pipeline = candidatePipelineRows[0] || {};
  const applied = toNumber(pipeline.applied);
  const screening = toNumber(pipeline.screening);
  const interview = toNumber(pipeline.interview);
  const offer = toNumber(pipeline.offer);
  const hired = toNumber(pipeline.hired);

  const skillFrequency = new Map();
  requirementKeywordRows.forEach((row) => {
    String(row.keywords || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((keyword) => {
        skillFrequency.set(keyword, (skillFrequency.get(keyword) || 0) + 1);
      });
  });

  const topSkills = [...skillFrequency.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const recruiters = recruiterRows.map((row) => {
    const jobsHandled = toNumber(row.jobsHandled);
    const hires = toNumber(row.hires);

    return {
      id: row.id,
      name: row.name,
      role: row.role,
      jobsHandled,
      hires,
      interviews: toNumber(row.interviews),
      conversionRate: toRatio(hires, jobsHandled)
    };
  });

  const runtimeMetrics = metrics.getMetrics();
  const convertedToCandidates = toNumber(convertedEnquiryRows[0]?.converted);

  const response = {
    overview: {
      totalCandidates: toNumber(totalCandidates),
      totalRequirements: toNumber(totalRequirements),
      totalEnquiries: toNumber(totalEnquiries),
      totalCompanies: toNumber(totalCompanies),
      totalUsers: toNumber(totalUsers),
      activeToday: toNumber(activeToday)
    },
    candidates: {
      total: toNumber(totalCandidates),
      pipeline: {
        applied,
        screening,
        interview,
        offer,
        hired
      },
      monthlyTrend: candidateTrendRows.map((row) => ({
        month: row.month,
        candidates: toNumber(row.candidates),
        hires: toNumber(row.hires)
      })),
      topSkills
    },
    requirements: {
      total: toNumber(totalRequirements),
      open: toNumber(requirementStatusMap.open),
      closed: toNumber(requirementStatusMap.closed),
      urgent: toNumber(urgentRequirements)
    },
    enquiries: {
      total: toNumber(totalEnquiries),
      convertedToCandidates,
      pending: Math.max(0, toNumber(totalEnquiries) - convertedToCandidates),
      sources: enquirySourceRows.map((row) => ({
        label: row.label,
        value: toNumber(row.value)
      }))
    },
    companies: {
      topRequirements: requirementCompanyRows.map((row) => ({
        companyId: toNumber(row.companyId) || null,
        label: row.label,
        requirements: toNumber(row.requirements)
      })),
      candidateVolume: candidateCompanyRows.map((row) => ({
        companyId: toNumber(row.companyId) || null,
        label: row.label,
        candidates: toNumber(row.candidates)
      })),
      topHiring: companyHiringRows.map((row) => ({
        label: row.label,
        hires: toNumber(row.hires)
      })),
      active: activeCompanyRows.map((row) => ({
        label: row.label,
        openJobs: toNumber(row.openJobs)
      }))
    },
    performance: {
      recruiters
    },
    insights: {
      sources: topSourceRows.map((row) => ({
        label: row.label,
        value: toNumber(row.value)
      })),
      locations: topLocationRows.map((row) => ({
        label: row.label,
        value: toNumber(row.value)
      })),
      skills: topSkills
    },
    system: {
      apiResponse: toNumber(runtimeMetrics.requests.avgResponseTime),
      queuePending: toNumber(queueStatusMap.PENDING),
      errors: toNumber(runtimeMetrics.requests.errors)
    }
  };

  await setCachedData(cacheKey, response, 120, ["admin-dashboard"]);
  return response;
};

export const getEnterpriseFlowService = async (actor = null) => {
  const today = new Date();

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const scope = await resolveAdminScope(actor);
  const jobWhere = buildUserWhere(scope.userIds);
  const jobFilterSql = buildUserFilterSql(scope.userIds, "ja");
  const userFilterSql = buildUserFilterSql(scope.userIds, "u", "id");

  const [currentMonthApplications, previousMonthApplications, remainingPipeline] = await Promise.all([
    JobApplication.count({
      where: {
        createdAt: { [Op.gte]: monthStart, [Op.lt]: nextMonthStart },
        ...jobWhere
      }
    }),
    JobApplication.count({
      where: {
        createdAt: { [Op.gte]: previousMonthStart, [Op.lt]: monthStart },
        ...jobWhere
      }
    }),
    JobApplication.count({
      where: {
        status: { [Op.notIn]: ["Offer", "Hired", "Rejected"] },
        ...jobWhere
      }
    })
  ]);

  const growthPercentage = previousMonthApplications
    ? Number((((currentMonthApplications - previousMonthApplications) / previousMonthApplications) * 100).toFixed(2))
    : currentMonthApplications > 0
      ? 100
      : 0;

  const monthlyGrowth = await sequelize.query(
    withSource(
      `
      SELECT
        DATE_FORMAT(createdAt, '%Y-%m') AS month,
        COUNT(*) AS applications
      FROM job_applications
      WHERE deletedAt IS NULL
        AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        ${jobFilterSql}
      GROUP BY month
      ORDER BY month ASC
    `,
      "admin.enterprise.monthly_growth"
    ),
    { type: QueryTypes.SELECT, replacements: { userIds: scope.userIds } }
  );

  const statusFlow = await sequelize.query(
    withSource(
      `
      SELECT
        status,
        COUNT(*) AS count
      FROM job_applications
      WHERE deletedAt IS NULL
        ${jobFilterSql}
      GROUP BY status
      ORDER BY count DESC
    `,
      "admin.enterprise.status_flow"
    ),
    { type: QueryTypes.SELECT, replacements: { userIds: scope.userIds } }
  );

  const interviewWindowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const interviewWindowEnd = new Date(interviewWindowStart);
  interviewWindowEnd.setDate(interviewWindowEnd.getDate() + 30);

  const interviews = await Interview.findAll({
    where: {
      scheduled_at: {
        [Op.gte]: interviewWindowStart,
        [Op.lt]: interviewWindowEnd
      },
      ...buildUserWhere(scope.userIds)
    },
    include: [
      {
        model: JobApplication,
        attributes: ["id", "job_title", "company_name", "location"]
      },
      {
        model: User,
        attributes: ["id", "name", "email"]
      }
    ],
    order: [["scheduled_at", "ASC"]]
  });

  const interviewDayMap = {};
  interviews.forEach((item) => {
    const day = item.scheduled_at.toISOString().split("T")[0];
    interviewDayMap[day] = (interviewDayMap[day] || 0) + 1;
  });

  const interviewCalendar = [];
  for (let i = 0; i < 30; i += 1) {
    const day = new Date(interviewWindowStart);
    day.setDate(day.getDate() + i);

    const key = day.toISOString().split("T")[0];
    interviewCalendar.push({
      date: key,
      interviews: interviewDayMap[key] || 0,
      free: !interviewDayMap[key]
    });
  }

  const peopleWorkload = await sequelize.query(
    withSource(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(DISTINCT ja.id) AS total_applications,
        SUM(CASE WHEN ja.status IN ('Offer','Hired','Rejected') THEN 0 ELSE 1 END) AS active_pipeline,
        COUNT(DISTINCT CASE WHEN i.scheduled_at >= NOW() THEN i.id END) AS upcoming_interviews
      FROM users u
      LEFT JOIN job_applications ja ON ja.user_id = u.id AND ja.deletedAt IS NULL
      LEFT JOIN interviews i ON i.user_id = u.id
      WHERE 1=1
      ${userFilterSql}
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_applications DESC
    `,
      "admin.enterprise.people_workload"
    ),
    { type: QueryTypes.SELECT, replacements: { userIds: scope.userIds } }
  );

  const clientCompanies = await sequelize.query(
    withSource(
      `
      SELECT
        COALESCE(c.id, 0) AS company_id,
        COALESCE(c.name, ja.company_name) AS company_name,
        COALESCE(c.location, 'Unknown') AS company_location,
        COUNT(ja.id) AS applications,
        SUM(CASE WHEN ja.status IN ('Screening','Interviewing','Technical Test','Final Round','Offer','Hired') THEN 1 ELSE 0 END) AS responses,
        SUM(CASE WHEN ja.status IN ('Offer','Hired') THEN 1 ELSE 0 END) AS offers
      FROM job_applications ja
      LEFT JOIN companies c ON c.id = ja.company_id
      WHERE ja.deletedAt IS NULL
        ${jobFilterSql}
      GROUP BY company_id, company_name, company_location
      ORDER BY applications DESC
      LIMIT 30
    `,
      "admin.enterprise.client_companies"
    ),
    { type: QueryTypes.SELECT, replacements: { userIds: scope.userIds } }
  );

  const applicantFlow = await sequelize.query(
    withSource(
      `
      SELECT
        ja.user_id,
        u.name AS applicant_name,
        COALESCE(ja.location, 'Unknown') AS location,
        ja.company_name,
        COUNT(ja.id) AS applications
      FROM job_applications ja
      LEFT JOIN users u ON u.id = ja.user_id
      WHERE ja.deletedAt IS NULL
        ${jobFilterSql}
      GROUP BY ja.user_id, applicant_name, location, ja.company_name
      ORDER BY applications DESC
      LIMIT 100
    `,
      "admin.enterprise.applicant_flow"
    ),
    { type: QueryTypes.SELECT, replacements: { userIds: scope.userIds } }
  );

  const locationHeatmap = await sequelize.query(
    withSource(
      `
      SELECT
        COALESCE(location, 'Unknown') AS location,
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('Offer','Hired') THEN 1 ELSE 0 END) AS success
      FROM job_applications
      WHERE deletedAt IS NULL
        ${buildUserFilterSql(scope.userIds)}
      GROUP BY location
      ORDER BY total DESC
      LIMIT 20
    `,
      "admin.enterprise.location_heatmap"
    ),
    { type: QueryTypes.SELECT, replacements: { userIds: scope.userIds } }
  );

  return {
    process: {
      currentMonthApplications,
      previousMonthApplications,
      growthPercentage,
      remainingPipeline
    },
    monthlyGrowth: monthlyGrowth.map((item) => ({
      month: item.month,
      applications: toNumber(item.applications)
    })),
    statusFlow: statusFlow.map((item) => ({
      status: item.status,
      count: toNumber(item.count)
    })),
    interviews: {
      next30Days: interviews,
      calendar: interviewCalendar
    },
    peopleWorkload: peopleWorkload.map((item) => ({
      ...item,
      total_applications: toNumber(item.total_applications),
      active_pipeline: toNumber(item.active_pipeline),
      upcoming_interviews: toNumber(item.upcoming_interviews)
    })),
    clients: clientCompanies.map((item) => ({
      ...item,
      applications: toNumber(item.applications),
      responses: toNumber(item.responses),
      offers: toNumber(item.offers),
      responseRate: toNumber(item.applications)
        ? Number(((toNumber(item.responses) / toNumber(item.applications)) * 100).toFixed(2))
        : 0
    })),
    applicantFlow: applicantFlow.map((item) => ({
      ...item,
      applications: toNumber(item.applications)
    })),
    locationHeatmap: locationHeatmap.map((item) => ({
      ...item,
      total: toNumber(item.total),
      success: toNumber(item.success)
    }))
  };
};

export const getFeatureCenterService = async () => {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    roleRows,
    activeUsers30d,
    failedLogins24h,
    lockedAccounts,
    sessionRecords30d,
    totalJobs,
    monthlyTrendRows,
    weeklyVelocityRows,
    heatmapRows,
    funnelRows,
    companyCount,
    blacklistedCount,
    contactCount,
    locationCount,
    statusTransitions,
    avgLifecycleRows,
    queueRows,
    delayedJobs,
    automationJobs,
    exportRows,
    totalDocuments,
    resumeDocuments,
    coverLetterDocuments,
    versionedRows,
    downloadLogs,
    workspaceCount,
    workspaceMembers,
    sharedJobs,
    jobsWithInternalNotesRows,
    interviewsTotal,
    interviewsUpcoming,
    interviewsCompleted,
    interviewsWithFeedback,
    tenantsTotal,
    activeTenants,
    planRows,
    auditTrailCount
  ] = await Promise.all([
    User.findAll({
      attributes: ["role", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["role"],
      raw: true
    }),
    LoginHistory.count({
      where: {
        createdAt: { [Op.gte]: last30Days },
        status: "success"
      },
      distinct: true,
      col: "user_id"
    }),
    LoginHistory.count({
      where: {
        createdAt: { [Op.gte]: last24Hours },
        status: "failed"
      }
    }),
    User.count({
      where: {
        lockUntil: { [Op.gt]: now }
      }
    }),
    LoginHistory.count({
      where: {
        createdAt: { [Op.gte]: last30Days },
        status: "success"
      }
    }),
    JobApplication.count(),
    sequelize.query(
      withSource(
        `
        SELECT DATE_FORMAT(createdAt, '%Y-%m') AS month, COUNT(*) AS total
        FROM job_applications
        WHERE deletedAt IS NULL
          AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY month
        ORDER BY month ASC
      `,
        "admin.feature.monthly_trend"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT YEARWEEK(createdAt, 1) AS week_bucket, COUNT(*) AS total
        FROM job_applications
        WHERE deletedAt IS NULL
          AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
        GROUP BY week_bucket
        ORDER BY week_bucket ASC
      `,
        "admin.feature.weekly_velocity"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT DATE_FORMAT(changed_at, '%Y-%m-%d') AS day, to_status, COUNT(*) AS total
        FROM job_status_histories
        WHERE changed_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY day, to_status
      `,
        "admin.feature.status_heatmap"
      ),
      { type: QueryTypes.SELECT }
    ),
    sequelize.query(
      withSource(
        `
        SELECT
          COUNT(*) AS applied,
          SUM(CASE WHEN status IN ('Screening','Interviewing','Technical Test','Final Round','Offer','Hired') THEN 1 ELSE 0 END) AS interviewed,
          SUM(CASE WHEN status IN ('Offer','Hired') THEN 1 ELSE 0 END) AS offers
        FROM job_applications
        WHERE deletedAt IS NULL
      `,
        "admin.feature.funnel_summary"
      ),
      { type: QueryTypes.SELECT }
    ),
    Company.count(),
    Company.count({ where: { is_blacklisted: true } }),
    Contact.count(),
    sequelize.query(
      withSource(
        `
        SELECT COUNT(DISTINCT COALESCE(location, 'Unknown')) AS total
        FROM job_applications
        WHERE deletedAt IS NULL
      `,
        "admin.feature.location_count"
      ),
      { type: QueryTypes.SELECT }
    ),
    JobStatusHistory.count(),
    sequelize.query(
      withSource(
        `
        SELECT AVG(TIMESTAMPDIFF(HOUR, createdAt, updatedAt)) AS avg_hours
        FROM job_applications
        WHERE deletedAt IS NULL
          AND status IN ('Offer','Hired','Rejected')
      `,
        "admin.feature.avg_lifecycle"
      ),
      { type: QueryTypes.SELECT }
    ),
    QueueJob.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["status"],
      raw: true
    }),
    QueueJob.count({
      where: {
        status: "PENDING",
        scheduled_for: { [Op.gt]: now }
      }
    }),
    QueueJob.count({
      where: {
        type: {
          [Op.in]: [
            "RUN_AUTOMATION_RULES",
            "AUTO_STATUS_ADVANCE",
            "FOLLOW_UP_REMINDER"
          ]
        }
      }
    }),
    QueueJob.findAll({
      attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      where: {
        type: { [Op.in]: ["EXPORT_CSV", "EXPORT_CSV_ADMIN"] }
      },
      group: ["status"],
      raw: true
    }),
    Document.count(),
    Document.count({ where: { file_type: "resume" } }),
    Document.count({ where: { file_type: "cover_letter" } }),
    sequelize.query(
      withSource(
        `
        SELECT COUNT(*) AS total
        FROM documents
        WHERE deletedAt IS NULL AND version > 1
      `,
        "admin.feature.versioned_documents"
      ),
      { type: QueryTypes.SELECT }
    ),
    AuditLog.count({
      where: {
        action: "DOWNLOAD_DOCUMENT"
      }
    }),
    Workspace.count(),
    WorkspaceMember.count(),
    JobApplication.count({
      where: {
        workspace_id: { [Op.not]: null }
      }
    }),
    sequelize.query(
      withSource(
        `
        SELECT COUNT(*) AS total
        FROM job_applications
        WHERE deletedAt IS NULL
          AND internal_notes IS NOT NULL
          AND JSON_LENGTH(internal_notes) > 0
      `,
        "admin.feature.internal_notes"
      ),
      { type: QueryTypes.SELECT }
    ),
    Interview.count(),
    Interview.count({
      where: {
        scheduled_at: { [Op.gte]: now, [Op.lt]: next30Days }
      }
    }),
    Interview.count({
      where: {
        status: "completed"
      }
    }),
    Interview.count({
      where: {
        feedback: { [Op.not]: null }
      }
    }),
    Tenant.count(),
    Tenant.count({ where: { is_active: true } }),
    Tenant.findAll({
      attributes: ["plan", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["plan"],
      raw: true
    }),
    AuditLog.count()
  ]);

  const roleCount = roleRows.reduce((acc, row) => {
    acc[row.role] = toNumber(row.count);
    return acc;
  }, {});

  const queueByStatus = queueRows.reduce((acc, row) => {
    acc[row.status] = toNumber(row.count);
    return acc;
  }, {});

  const exportByStatus = exportRows.reduce((acc, row) => {
    acc[row.status] = toNumber(row.count);
    return acc;
  }, {});

  const planDistribution = planRows.reduce((acc, row) => {
    acc[row.plan] = toNumber(row.count);
    return acc;
  }, {});

  const funnel = funnelRows[0] || { applied: 0, interviewed: 0, offers: 0 };
  const applied = toNumber(funnel.applied);
  const interviewed = toNumber(funnel.interviewed);
  const offers = toNumber(funnel.offers);

  const avgLifecycleHours = Number((toNumber(avgLifecycleRows[0]?.avg_hours) || 0).toFixed(2));
  const uniqueLocations = toNumber(locationCount[0]?.total);
  const jobsWithInternalNotes = toNumber(jobsWithInternalNotesRows[0]?.total);
  const versionedDocuments = toNumber(versionedRows[0]?.total);

  const runtimeMetrics = metrics.getMetrics();
  const cacheHealth = getCacheHealth();

  const modules = [
    {
      key: "iam",
      title: "Identity & Access Management (IAM)",
      tech: "Node.js + JWT + Sequelize",
      status: "active",
      metrics: {
        totalUsers: toNumber(roleCount.recruiter) + toNumber(roleCount.superadmin),
        superadminUsers: toNumber(roleCount.superadmin),
        recruiterUsers: toNumber(roleCount.recruiter),
        activeUsers30d: toNumber(activeUsers30d),
        failedLogins24h: toNumber(failedLogins24h),
        lockedAccounts: toNumber(lockedAccounts),
        sessions30d: toNumber(sessionRecords30d)
      }
    },
    {
      key: "analytics",
      title: "Advanced Analytics Engine",
      tech: "Sequelize Raw SQL + MySQL Indexing + Cache",
      status: "active",
      metrics: {
        monthlyTrendPoints: monthlyTrendRows.length,
        weeklyVelocityPoints: weeklyVelocityRows.length,
        heatmapPoints: heatmapRows.length,
        companyInsights: toNumber(companyCount),
        locationInsights: uniqueLocations,
        interviewConversionRate: toRatio(interviewed, applied),
        offerConversionRate: toRatio(offers, applied)
      }
    },
    {
      key: "timeline",
      title: "Status History & Timeline Engine",
      tech: "JobStatusHistory + Transactions",
      status: "active",
      metrics: {
        statusTransitions: toNumber(statusTransitions),
        timelineEvents: toNumber(statusTransitions) + toNumber(interviewsTotal),
        avgLifecycleHours
      }
    },
    {
      key: "notifications",
      title: "Notification & Event System",
      tech: "QueueJob + Worker",
      status: "active",
      metrics: {
        pendingJobs: toNumber(queueByStatus.PENDING),
        processingJobs: toNumber(queueByStatus.PROCESSING),
        failedJobs: toNumber(queueByStatus.FAILED),
        deadLetters: toNumber(queueByStatus.DEAD_LETTER),
        delayedJobs: toNumber(delayedJobs)
      }
    },
    {
      key: "documents",
      title: "Document & Resume Management",
      tech: "Node + File Storage + DB Metadata",
      status: "active",
      metrics: {
        totalDocuments: toNumber(totalDocuments),
        resumeDocuments: toNumber(resumeDocuments),
        coverLetterDocuments: toNumber(coverLetterDocuments),
        versionedDocuments,
        downloadLogs: toNumber(downloadLogs)
      }
    },
    {
      key: "collaboration",
      title: "Multi-User / Team Collaboration",
      tech: "Sequelize Relations",
      status: "active",
      metrics: {
        workspaces: toNumber(workspaceCount),
        workspaceMembers: toNumber(workspaceMembers),
        sharedJobs: toNumber(sharedJobs),
        jobsWithInternalNotes
      }
    },
    {
      key: "company",
      title: "Company Intelligence Module",
      tech: "MySQL + Analytics",
      status: "active",
      metrics: {
        totalCompanies: toNumber(companyCount),
        blacklistedCompanies: toNumber(blacklistedCount),
        recruiterContacts: toNumber(contactCount),
        trackedLocations: uniqueLocations
      }
    },
    {
      key: "interviews",
      title: "Interview Scheduling System",
      tech: "Queue + Status + Timeline",
      status: "active",
      metrics: {
        totalInterviews: toNumber(interviewsTotal),
        upcoming30Days: toNumber(interviewsUpcoming),
        completedInterviews: toNumber(interviewsCompleted),
        feedbackCaptured: toNumber(interviewsWithFeedback)
      }
    },
    {
      key: "monitoring",
      title: "Admin Monitoring & Observability",
      tech: "Metrics + Logger + Middleware",
      status: "active",
      metrics: {
        apiRequests: toNumber(runtimeMetrics.requests.total),
        apiErrorRate: toNumber(runtimeMetrics.requests.errorRate),
        avgResponseMs: toNumber(runtimeMetrics.requests.avgResponseTime),
        rateLimitHits: toNumber(runtimeMetrics.requests.rateLimited),
        dbLatencyMs: toNumber(runtimeMetrics.system.dbLatencyMs)
      }
    },
    {
      key: "performance",
      title: "Performance & Scalability Layer",
      tech: "Caching + Indexing + Transactions",
      status: "active",
      metrics: {
        cacheProvider: cacheHealth.provider,
        cacheEntries: toNumber(cacheHealth.entries),
        queueAvgProcessingMs: toNumber(runtimeMetrics.queue.avgProcessingTime),
        totalJobs: toNumber(totalJobs)
      }
    },
    {
      key: "workflow",
      title: "Workflow Automation Engine",
      tech: "Queue + Event-driven",
      status: "active",
      metrics: {
        automationJobs: toNumber(automationJobs),
        delayedReminders: toNumber(delayedJobs),
        auditEvents: toNumber(auditTrailCount)
      }
    },
    {
      key: "search",
      title: "Search & Filtering Engine",
      tech: "Indexed SQL",
      status: "active",
      metrics: {
        searchableApplications: toNumber(totalJobs),
        filterableCompanies: toNumber(companyCount),
        filterableLocations: uniqueLocations
      }
    },
    {
      key: "export",
      title: "Export & Reporting System",
      tech: "Fast-CSV + Queue Worker",
      status: "active",
      metrics: {
        exportPending: toNumber(exportByStatus.PENDING),
        exportCompleted: toNumber(exportByStatus.COMPLETED),
        exportFailed: toNumber(exportByStatus.FAILED)
      }
    },
    {
      key: "security",
      title: "Security Hardening",
      tech: "Helmet + Rate Limit + JWT",
      status: "active",
      metrics: {
        jwtSessionRecords30d: toNumber(sessionRecords30d),
        failedLogins24h: toNumber(failedLogins24h),
        lockedAccounts: toNumber(lockedAccounts),
        rateLimitHits: toNumber(runtimeMetrics.requests.rateLimited)
      }
    },
    {
      key: "saas",
      title: "SaaS-Ready Features",
      tech: "Tenant + Plan + Usage Layer",
      status: "active",
      metrics: {
        tenants: toNumber(tenantsTotal),
        activeTenants: toNumber(activeTenants),
        freePlan: toNumber(planDistribution.free),
        proPlan: toNumber(planDistribution.pro),
        enterprisePlan: toNumber(planDistribution.enterprise)
      }
    }
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalModules: modules.length,
      activeModules: modules.filter((module) => module.status === "active").length,
      auditTrailCount: toNumber(auditTrailCount),
      totalApplications: toNumber(totalJobs)
    },
    modules
  };
};

export const getAllUsersService = async (actor = null, query = {}) => {
  const scope = await resolveAdminScope(actor);
  const where = scope.tenantId && !scope.isSuperAdmin
    ? { tenant_id: scope.tenantId }
    : {};
  const attributes = [
    "id",
    "name",
    "email",
    "role",
    "tenant_id",
    "lastLoginAt",
    "isActive",
    "createdAt"
  ];
  const pagination = resolvePagePagination(query, {
    defaultLimit: 200,
    maxLimit: 500
  });

  if (pagination.enabled) {
    const { rows, count } = await User.findAndCountAll({
      where,
      attributes,
      order: [["createdAt", "DESC"]],
      limit: pagination.limit,
      offset: pagination.offset
    });

    return buildPageResult(rows, count, pagination);
  }

  return User.findAll({
    where,
    attributes,
    order: [["createdAt", "DESC"]]
  });
};

export const getPlatformJobsService = async (actor = null, query = {}) => {
  if (!actor || !isSuperAdminRole(actor.role)) {
    throw new AppError("Superadmin access required", 403);
  }

  const pagination = resolvePagePagination(query, {
    defaultLimit: 50,
    maxLimit: 200
  });

  const where = {};
  const status = String(query.status || "").trim();
  const search = String(query.search || "").trim();

  if (status) {
    where.status = status;
  }

  if (search) {
    where[Op.or] = [
      { company_name: { [Op.like]: `%${search}%` } },
      { job_title: { [Op.like]: `%${search}%` } }
    ];
  }

  const { rows, count } = await JobApplication.findAndCountAll({
    where,
    attributes: [
      "id",
      "user_id",
      "company_id",
      "company_name",
      "job_title",
      "status",
      "application_source",
      "priority",
      "workspace_id",
      "applied_at",
      "createdAt",
      "updatedAt"
    ],
    include: [
      {
        model: User,
        attributes: ["id", "name", "email"]
      }
    ],
    order: [["createdAt", "DESC"]],
    limit: pagination.limit,
    offset: pagination.offset
  });

  return buildPageResult(rows, count, pagination);
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const assertRoleExists = async (role) => {
  const normalizedRole = normalizeRole(role);
  const roleRecord = await Role.findOne({ where: { key: normalizedRole, status: "active" } });
  if (!roleRecord) {
    throw new AppError("Invalid role", 400);
  }

  return roleRecord;
};

const assertTenantAccess = async (actor, tenantId) => {
  if (!actor || isSuperAdminRole(actor.role)) {
    return;
  }

  if (tenantId && actor.tenant_id !== tenantId) {
    throw new AppError("Access denied for tenant scope", 403);
  }
};

export const getAllWorkspacesService = async (actor = null) => {
  const scope = await resolveAdminScope(actor);
  const tenantWhere = scope.tenantId && !scope.isSuperAdmin ? { id: scope.tenantId } : {};

  const tenants = await Tenant.findAll({
    where: tenantWhere,
    attributes: ["id", "name", "slug", "plan", "subscription_status", "is_active", "createdAt"],
    order: [["createdAt", "DESC"]],
    raw: true
  });

  const tenantIds = tenants.map((tenant) => tenant.id);
  if (!tenantIds.length) {
    return [];
  }

  const workspaceCounts = await Workspace.findAll({
    attributes: ["tenant_id", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where: { tenant_id: { [Op.in]: tenantIds } },
    group: ["tenant_id"],
    raw: true
  });

  const userCounts = await User.findAll({
    attributes: ["tenant_id", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where: { tenant_id: { [Op.in]: tenantIds } },
    group: ["tenant_id"],
    raw: true
  });

  const workspaceCountMap = new Map(workspaceCounts.map((row) => [row.tenant_id, toNumber(row.count)]));
  const userCountMap = new Map(userCounts.map((row) => [row.tenant_id, toNumber(row.count)]));

  return tenants.map((tenant) => ({
    ...tenant,
    workspace_count: workspaceCountMap.get(tenant.id) || 0,
    user_count: userCountMap.get(tenant.id) || 0
  }));
};

export const createUserService = async (actor, payload = {}) => {
  const name = String(payload.name || "").trim();
  const email = normalizeEmail(payload.email);
  const role = normalizeRole(payload.role || "recruiter");
  const password = String(payload.password || "").trim();
  const tenantId = payload.tenant_id ? Number(payload.tenant_id) : null;

  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }

  await assertRoleExists(role);

  if (role !== "superadmin" && tenantId) {
    await assertTenantAccess(actor, tenantId);
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }
  }

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    tenant_id: role === "superadmin" ? null : tenantId
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
};

export const updateUserService = async (actor, userId, payload = {}) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!isSuperAdminRole(actor?.role) && actor?.tenant_id !== user.tenant_id) {
    throw new AppError("Access denied", 403);
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new AppError("Name is required", 400);
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new AppError("Email is required", 400);
    }
    if (email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        throw new AppError("Email already in use", 409);
      }
      updates.email = email;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "role")) {
    const role = normalizeRole(payload.role);
    await assertRoleExists(role);
    if (role === "superadmin" && !isSuperAdminRole(actor?.role)) {
      throw new AppError("Superadmin access required", 403);
    }
    updates.role = role;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "tenant_id")) {
    const tenantId = payload.tenant_id ? Number(payload.tenant_id) : null;
    if (tenantId) {
      await assertTenantAccess(actor, tenantId);
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        throw new AppError("Tenant not found", 404);
      }
    }
    const effectiveRole = updates.role || user.role;
    updates.tenant_id = effectiveRole === "superadmin" ? null : tenantId;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
    updates.isActive = Boolean(payload.isActive);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "password")) {
    const password = String(payload.password || "").trim();
    if (password) {
      updates.password = password;
    }
  }

  await user.update(updates);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenant_id: user.tenant_id,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
};

export const deleteUserService = async (actor, userId) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (actor?.id === user.id) {
    throw new AppError("You cannot delete your own account", 400);
  }

  if (!isSuperAdminRole(actor?.role) && actor?.tenant_id !== user.tenant_id) {
    throw new AppError("Access denied", 403);
  }

  await user.destroy();
  return { deleted: true };
};

export const updateWorkspaceService = async (actor, workspaceId, payload = {}) => {
  const tenant = await Tenant.findByPk(workspaceId);
  if (!tenant) {
    throw new AppError("Workspace not found", 404);
  }

  await assertTenantAccess(actor, tenant.id);

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "name")) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw new AppError("Workspace name is required", 400);
    }
    updates.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "plan")) {
    const plan = String(payload.plan || "").trim().toLowerCase();
    if (!["free", "pro", "enterprise"].includes(plan)) {
      throw new AppError("Invalid plan", 400);
    }
    updates.plan = plan;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "subscription_status")) {
    const status = String(payload.subscription_status || "").trim().toLowerCase();
    if (!["active", "past_due", "canceled", "incomplete"].includes(status)) {
      throw new AppError("Invalid subscription status", 400);
    }
    updates.subscription_status = status;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "is_active")) {
    updates.is_active = Boolean(payload.is_active);
  }

  await tenant.update(updates);
  return tenant;
};
