import { sequelize } from "../../models/index.js";
import { getCachedData, setCachedData } from "../../utils/cache.js";
import { attachQuerySource } from "../../utils/querySource.js";

const toNumber = (value) => Number(value || 0);
const toPercent = (numerator, denominator) => (denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0);

const computeMoMTrend = (monthlyApplications = []) => {
  if (!Array.isArray(monthlyApplications) || monthlyApplications.length < 2) {
    return {
      previousMonth: null,
      currentMonth: monthlyApplications[0]?.month || null,
      previousCount: 0,
      currentCount: monthlyApplications[0]?.count || 0,
      delta: 0,
      changePercent: 0
    };
  }

  const previous = monthlyApplications[monthlyApplications.length - 2];
  const current = monthlyApplications[monthlyApplications.length - 1];
  const previousCount = toNumber(previous?.count);
  const currentCount = toNumber(current?.count);

  return {
    previousMonth: previous?.month || null,
    currentMonth: current?.month || null,
    previousCount,
    currentCount,
    delta: currentCount - previousCount,
    changePercent: previousCount ? Number((((currentCount - previousCount) / previousCount) * 100).toFixed(2)) : (currentCount > 0 ? 100 : 0)
  };
};

const computeMomentumScore = ({ applicationToInterviewRate = 0, interviewToOfferRate = 0, offerToHiredRate = 0 }, trend = {}) => {
  const trendScore = Math.max(0, Math.min(100, toNumber(trend.changePercent) + 50));
  const weighted = (
    (toNumber(applicationToInterviewRate) * 0.35)
    + (toNumber(interviewToOfferRate) * 0.35)
    + (toNumber(offerToHiredRate) * 0.2)
    + (trendScore * 0.1)
  );

  return Number(Math.max(0, Math.min(100, weighted)).toFixed(2));
};

const buildAnalyticsCacheKey = ({ userId, workspaceId, months }) => {
  if (workspaceId) {
    return `analytics:workspace:${workspaceId}:user:${userId}:months:${months}`;
  }

  return `analytics:user:${userId}:months:${months}`;
};

const buildAnalyticsCacheTags = ({ userId, workspaceId }) => {
  const tags = [`analytics:user:${userId}`];
  if (workspaceId) {
    tags.push(`analytics:workspace:${workspaceId}`);
  }
  return tags;
};

export const getJobAnalyticsService = async (userId, months = 6, workspaceId = null) => {
  const safeMonths = Math.max(1, Math.min(24, Number(months) || 6));
  const parsedWorkspaceId = Number(workspaceId);
  const scopedWorkspaceId = Number.isInteger(parsedWorkspaceId) && parsedWorkspaceId > 0
    ? parsedWorkspaceId
    : null;
  const cacheKey = buildAnalyticsCacheKey({
    userId,
    workspaceId: scopedWorkspaceId,
    months: safeMonths
  });
  const cacheTags = buildAnalyticsCacheTags({ userId, workspaceId: scopedWorkspaceId });

  const workspaceFilter = scopedWorkspaceId ? "AND workspace_id = :workspaceId" : "AND workspace_id IS NULL";
  const workspaceFilterJa = scopedWorkspaceId ? "AND ja.workspace_id = :workspaceId" : "AND ja.workspace_id IS NULL";
  const workspaceReplacements = scopedWorkspaceId ? { workspaceId: scopedWorkspaceId } : {};

  const cached = await getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  const analytics = {};

  const [monthlyRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        DATE_FORMAT(createdAt, '%Y-%m') AS month,
        COUNT(id) AS count
      FROM job_applications
      WHERE user_id = :userId
        AND createdAt >= DATE_SUB(NOW(), INTERVAL :months MONTH)
        AND deletedAt IS NULL
        ${workspaceFilter}
      GROUP BY month
      ORDER BY month ASC
    `,
      "analytics.monthly_applications"
    ),
    { replacements: { userId, months: safeMonths, ...workspaceReplacements } }
  );

  analytics.monthlyApplications = monthlyRows.map((row) => ({
    month: row.month,
    count: toNumber(row.count)
  }));
  analytics.monthlyTrend = computeMoMTrend(analytics.monthlyApplications);

  const [funnelRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        COUNT(id) AS applied,
        SUM(CASE WHEN status IN ('Screening', 'Interviewing', 'Technical Test', 'Final Round', 'Offer', 'Hired') THEN 1 ELSE 0 END) AS interviewed,
        SUM(CASE WHEN status IN ('Offer', 'Hired') THEN 1 ELSE 0 END) AS offers,
        SUM(CASE WHEN status = 'Hired' THEN 1 ELSE 0 END) AS hired,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
      FROM job_applications
      WHERE user_id = :userId
        AND deletedAt IS NULL
        ${workspaceFilter}
    `,
      "analytics.funnel_breakdown"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  const funnel = funnelRows[0] || {};
  const applied = toNumber(funnel.applied);
  const interviewed = toNumber(funnel.interviewed);
  const offers = toNumber(funnel.offers);
  const hired = toNumber(funnel.hired);
  const rejected = toNumber(funnel.rejected);

  analytics.funnel = {
    applied,
    interviewed,
    offers,
    hired,
    rejected,
    applicationToInterviewRate: applied ? Number(((interviewed / applied) * 100).toFixed(2)) : 0,
    interviewToOfferRate: interviewed ? Number(((offers / interviewed) * 100).toFixed(2)) : 0,
    offerToHiredRate: offers ? Number(((hired / offers) * 100).toFixed(2)) : 0,
    offerConversionRatio: applied ? Number(((offers / applied) * 100).toFixed(2)) : 0
  };

  analytics.funnelDropoff = {
    interviewDropoffCount: Math.max(0, applied - interviewed),
    offerDropoffCount: Math.max(0, interviewed - offers),
    hiredDropoffCount: Math.max(0, offers - hired),
    interviewDropoffPercent: toPercent(Math.max(0, applied - interviewed), applied),
    offerDropoffPercent: toPercent(Math.max(0, interviewed - offers), interviewed),
    hiredDropoffPercent: toPercent(Math.max(0, offers - hired), offers)
  };

  const [timeMetricRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        AVG(TIMESTAMPDIFF(HOUR, ja.createdAt, first_interview.first_interview_at)) AS avg_hours_to_interview,
        AVG(TIMESTAMPDIFF(HOUR, ja.createdAt, first_offer.first_offer_at)) AS avg_hours_to_offer
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
      WHERE ja.user_id = :userId
        AND ja.deletedAt IS NULL
        ${workspaceFilterJa}
    `,
      "analytics.time_metrics"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  const timeMetrics = timeMetricRows[0] || {};

  analytics.timeMetrics = {
    avgDaysToInterview: Number(((toNumber(timeMetrics.avg_hours_to_interview) || 0) / 24).toFixed(2)),
    avgDaysToOffer: Number(((toNumber(timeMetrics.avg_hours_to_offer) || 0) / 24).toFixed(2))
  };

  const [weeklyVelocityRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        YEARWEEK(createdAt, 1) AS year_week,
        COUNT(id) AS count
      FROM job_applications
      WHERE user_id = :userId
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
        AND deletedAt IS NULL
        ${workspaceFilter}
      GROUP BY year_week
      ORDER BY year_week ASC
    `,
      "analytics.weekly_velocity"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  analytics.applicationVelocity = weeklyVelocityRows.map((row) => ({
    week: String(row.year_week),
    count: toNumber(row.count)
  }));

  const [statusHeatmapRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        DATE_FORMAT(jsh.changed_at, '%Y-%m-%d') AS day,
        jsh.to_status,
        COUNT(jsh.id) AS count
      FROM job_status_histories jsh
      INNER JOIN job_applications ja ON ja.id = jsh.job_id
      WHERE jsh.user_id = :userId
        AND jsh.changed_at >= DATE_SUB(NOW(), INTERVAL :months MONTH)
        AND ja.deletedAt IS NULL
        ${workspaceFilterJa}
      GROUP BY day, to_status
      ORDER BY day ASC
    `,
      "analytics.status_heatmap"
    ),
    { replacements: { userId, months: safeMonths, ...workspaceReplacements } }
  );

  analytics.statusHeatmap = statusHeatmapRows.map((row) => ({
    day: row.day,
    status: row.to_status,
    count: toNumber(row.count)
  }));

  const [rejectionRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        DATE_FORMAT(createdAt, '%Y-%m') AS month,
        COUNT(id) AS rejected_count
      FROM job_applications
      WHERE user_id = :userId
        AND status = 'Rejected'
        AND createdAt >= DATE_SUB(NOW(), INTERVAL :months MONTH)
        AND deletedAt IS NULL
        ${workspaceFilter}
      GROUP BY month
      ORDER BY month ASC
    `,
      "analytics.rejection_trends"
    ),
    { replacements: { userId, months: safeMonths, ...workspaceReplacements } }
  );

  analytics.rejectionAnalytics = rejectionRows.map((row) => ({
    month: row.month,
    rejected: toNumber(row.rejected_count)
  }));

  const [companyRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        company_name,
        COUNT(id) AS total,
        SUM(CASE WHEN status IN ('Screening', 'Interviewing', 'Technical Test', 'Final Round', 'Offer', 'Hired') THEN 1 ELSE 0 END) AS responded,
        SUM(CASE WHEN status IN ('Offer', 'Hired') THEN 1 ELSE 0 END) AS offers
      FROM job_applications
      WHERE user_id = :userId
        AND deletedAt IS NULL
        ${workspaceFilter}
      GROUP BY company_name
      ORDER BY total DESC
      LIMIT 20
    `,
      "analytics.company_performance"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  analytics.companyPerformance = companyRows.map((row) => {
    const total = toNumber(row.total);
    const responded = toNumber(row.responded);
    const offersForCompany = toNumber(row.offers);

    return {
      company: row.company_name,
      total,
      responseRate: total ? Number(((responded / total) * 100).toFixed(2)) : 0,
      offerRate: total ? Number(((offersForCompany / total) * 100).toFixed(2)) : 0
    };
  });

  const [locationRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        COALESCE(location, 'Unknown') AS location,
        COUNT(id) AS total,
        SUM(CASE WHEN status IN ('Offer', 'Hired') THEN 1 ELSE 0 END) AS successful
      FROM job_applications
      WHERE user_id = :userId
        AND deletedAt IS NULL
        ${workspaceFilter}
      GROUP BY location
      ORDER BY total DESC
      LIMIT 20
    `,
      "analytics.location_insights"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  analytics.locationInsights = locationRows.map((row) => {
    const total = toNumber(row.total);
    const successful = toNumber(row.successful);

    return {
      location: row.location,
      total,
      successRate: total ? Number(((successful / total) * 100).toFixed(2)) : 0
    };
  });

  const [sourceRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        application_source,
        COUNT(id) AS total,
        SUM(CASE WHEN status IN ('Screening', 'Interviewing', 'Technical Test', 'Final Round', 'Offer', 'Hired') THEN 1 ELSE 0 END) AS responded,
        SUM(CASE WHEN status IN ('Offer', 'Hired') THEN 1 ELSE 0 END) AS offers,
        SUM(CASE WHEN status = 'Hired' THEN 1 ELSE 0 END) AS hired
      FROM job_applications
      WHERE user_id = :userId
        AND deletedAt IS NULL
        ${workspaceFilter}
      GROUP BY application_source
      ORDER BY total DESC
    `,
      "analytics.source_performance"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  analytics.sourcePerformance = sourceRows.map((row) => {
    const total = toNumber(row.total);
    const responded = toNumber(row.responded);
    const offersFromSource = toNumber(row.offers);
    const hiredFromSource = toNumber(row.hired);

    return {
      source: row.application_source || "Other",
      total,
      responseRate: toPercent(responded, total),
      offerRate: toPercent(offersFromSource, total),
      hiredRate: toPercent(hiredFromSource, total)
    };
  });

  const [pipelineAgingRows] = await sequelize.query(
    attachQuerySource(
      `
      SELECT
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(applied_at, createdAt)) <= 7 THEN 1 ELSE 0 END) AS age_0_7,
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(applied_at, createdAt)) BETWEEN 8 AND 21 THEN 1 ELSE 0 END) AS age_8_21,
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(applied_at, createdAt)) BETWEEN 22 AND 45 THEN 1 ELSE 0 END) AS age_22_45,
        SUM(CASE WHEN DATEDIFF(NOW(), COALESCE(applied_at, createdAt)) > 45 THEN 1 ELSE 0 END) AS age_46_plus
      FROM job_applications
      WHERE user_id = :userId
        AND status NOT IN ('Rejected', 'Hired')
        AND deletedAt IS NULL
        ${workspaceFilter}
    `,
      "analytics.pipeline_aging"
    ),
    { replacements: { userId, ...workspaceReplacements } }
  );

  const pipelineAging = pipelineAgingRows[0] || {};
  analytics.pipelineAging = {
    age0To7Days: toNumber(pipelineAging.age_0_7),
    age8To21Days: toNumber(pipelineAging.age_8_21),
    age22To45Days: toNumber(pipelineAging.age_22_45),
    age46PlusDays: toNumber(pipelineAging.age_46_plus)
  };

  analytics.summary = {
    totalTracked: applied,
    activePipeline: Math.max(0, applied - hired - rejected),
    conversionHealthScore: computeMomentumScore(analytics.funnel, analytics.monthlyTrend),
    averageDaysToInterview: analytics.timeMetrics.avgDaysToInterview,
    averageDaysToOffer: analytics.timeMetrics.avgDaysToOffer
  };

  await setCachedData(cacheKey, analytics, 900, cacheTags);
  return analytics;
};
