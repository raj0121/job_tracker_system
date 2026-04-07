import { Op } from "sequelize";
import { Interview, JobApplication } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const OFFER_STATUSES = new Set(["Offer", "Hired"]);

const normalizeYear = (value) => {
  const year = Number.parseInt(String(value || "").trim(), 10);
  const currentYear = new Date().getUTCFullYear();

  if (!Number.isInteger(year) || year < 2000 || year > currentYear + 1) {
    throw new AppError("Please provide a valid year in YYYY format.", 400);
  }

  return year;
};

const toRate = (count, total) => {
  if (!total) {
    return 0;
  }

  return Number(((count / total) * 100).toFixed(1));
};

export const getYearlyReportService = async (userId, yearInput) => {
  const year = normalizeYear(yearInput);
  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));

  const [jobs, interviews] = await Promise.all([
    JobApplication.findAll({
      where: {
        user_id: userId,
        applied_at: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      attributes: ["status", "applied_at"],
      raw: true
    }),
    Interview.findAll({
      where: {
        user_id: userId,
        scheduled_at: {
          [Op.gte]: startDate,
          [Op.lt]: endDate
        }
      },
      attributes: ["id"],
      raw: true
    })
  ]);

  const monthlyBreakdown = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    applications: 0
  }));

  let totalOffers = 0;
  let totalRejections = 0;

  for (const job of jobs) {
    const appliedDate = new Date(job.applied_at);
    const monthIndex = appliedDate.getUTCMonth();

    if (monthIndex >= 0 && monthIndex < monthlyBreakdown.length) {
      monthlyBreakdown[monthIndex].applications += 1;
    }

    if (OFFER_STATUSES.has(job.status)) {
      totalOffers += 1;
    }

    if (job.status === "Rejected") {
      totalRejections += 1;
    }
  }

  const totalApplications = jobs.length;
  const totalInterviews = interviews.length;

  return {
    year,
    generatedAt: new Date().toISOString(),
    summary: {
      totalApplications,
      totalInterviews,
      totalOffers,
      totalRejections
    },
    metrics: {
      interviewRate: toRate(totalInterviews, totalApplications),
      offerRate: toRate(totalOffers, totalApplications),
      rejectionRate: toRate(totalRejections, totalApplications)
    },
    monthlyBreakdown
  };
};
