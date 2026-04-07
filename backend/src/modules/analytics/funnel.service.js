import { JobApplication, sequelize } from "../../models/index.js";
import { getCachedData, setCachedData } from "../../utils/cache.js";

export const getFunnelAnalyticsService = async (userId) => {
  const cacheKey = `analytics:user:${userId}:funnel`;
  const cached = await getCachedData(cacheKey);

  if (cached) {
    return cached;
  }

  const results = await JobApplication.findAll({
    attributes: ["status", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where: { user_id: userId },
    group: ["status"],
    raw: true
  });

  const totals = {
    Applied: 0,
    Screening: 0,
    Interviewing: 0,
    "Technical Test": 0,
    "Final Round": 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0
  };

  for (const row of results) {
    totals[row.status] = parseInt(row.count, 10);
  }

  const applied = totals.Applied;
  const interviewStages =
    totals.Screening + totals.Interviewing + totals["Technical Test"] + totals["Final Round"];
  const offers = totals.Offer + totals.Hired;

  const payload = {
    totals,
    conversion: {
      interviewRate: applied > 0 ? Number(((interviewStages / applied) * 100).toFixed(2)) : 0,
      offerRate: applied > 0 ? Number(((offers / applied) * 100).toFixed(2)) : 0,
      rejectionRate: applied > 0 ? Number(((totals.Rejected / applied) * 100).toFixed(2)) : 0
    }
  };

  await setCachedData(cacheKey, payload, 300, [`analytics:user:${userId}`]);
  return payload;
};
