import { Op } from "sequelize";
import { Goal, Interview, JobApplication, Workspace } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { isWorkspaceMember } from "../workspace/workspace.service.js";

const RESPONSE_STATUSES = [
  "Screening",
  "Interviewing",
  "Technical Test",
  "Final Round",
  "Rejected",
  "Offer",
  "Hired"
];

const GOAL_METRICS = ["applications", "interviews", "offers", "hires", "responses"];
const GOAL_STATUSES = ["active", "completed", "paused", "archived"];

const parseIntSafe = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeDate = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }

  return date;
};

const normalizeGoalPayload = (payload = {}, isUpdate = false) => {
  const data = { ...payload };

  if (!isUpdate || data.title !== undefined) {
    const title = String(data.title || "").trim();
    if (!title) {
      throw new AppError("Goal title is required", 400);
    }
    data.title = title;
  }

  if (!isUpdate || data.metric_type !== undefined) {
    const metricType = String(data.metric_type || "").trim().toLowerCase();
    if (!GOAL_METRICS.includes(metricType)) {
      throw new AppError("Invalid goal metric type", 400);
    }
    data.metric_type = metricType;
  }

  if (!isUpdate || data.target_value !== undefined) {
    const targetValue = parseIntSafe(data.target_value);
    if (!targetValue || targetValue <= 0) {
      throw new AppError("target_value must be a positive integer", 400);
    }
    data.target_value = targetValue;
  }

  if (data.current_value !== undefined) {
    const currentValue = parseIntSafe(data.current_value);
    if (currentValue === null || currentValue < 0) {
      throw new AppError("current_value must be a non-negative integer", 400);
    }
    data.current_value = currentValue;
  }

  if (data.status !== undefined) {
    const status = String(data.status || "").trim().toLowerCase();
    if (!GOAL_STATUSES.includes(status)) {
      throw new AppError("Invalid goal status", 400);
    }
    data.status = status;
  }

  if (data.workspace_id !== undefined) {
    const workspaceId = parseIntSafe(data.workspace_id);
    data.workspace_id = workspaceId && workspaceId > 0 ? workspaceId : null;
  }

  if (data.is_auto_track !== undefined) {
    data.is_auto_track = Boolean(data.is_auto_track);
  }

  if (data.period_start !== undefined) {
    data.period_start = normalizeDate(data.period_start, "period_start");
  }

  if (data.period_end !== undefined) {
    data.period_end = normalizeDate(data.period_end, "period_end");
  }

  if (data.period_start && data.period_end && data.period_start > data.period_end) {
    throw new AppError("period_start cannot be after period_end", 400);
  }

  if (data.description !== undefined) {
    data.description = data.description ? String(data.description).trim() : null;
  }

  return data;
};

const assertWorkspaceAccess = async (workspaceId, actor) => {
  if (!workspaceId) {
    return;
  }

  const member = await isWorkspaceMember(workspaceId, actor);
  if (!member) {
    throw new AppError("Access denied to workspace", 403);
  }
};

const mergeDateRangeFilter = (baseWhere, fieldName, startDate, endDate) => {
  if (!startDate && !endDate) {
    return baseWhere;
  }

  const range = {};
  if (startDate) {
    range[Op.gte] = startDate;
  }
  if (endDate) {
    range[Op.lte] = endDate;
  }

  return {
    ...baseWhere,
    [fieldName]: range
  };
};

const resolveScopeFilter = (goal, userId) => {
  if (goal.workspace_id) {
    return {
      workspace_id: goal.workspace_id
    };
  }

  return {
    user_id: userId,
    workspace_id: { [Op.is]: null }
  };
};

const getMetricValue = async (goal, userId) => {
  const scopeFilter = resolveScopeFilter(goal, userId);
  const periodStart = goal.period_start ? new Date(goal.period_start) : null;
  const periodEnd = goal.period_end ? new Date(goal.period_end) : null;

  if (goal.metric_type === "applications") {
    const where = mergeDateRangeFilter(scopeFilter, "applied_at", periodStart, periodEnd);
    return JobApplication.count({ where });
  }

  if (goal.metric_type === "interviews") {
    const where = mergeDateRangeFilter({}, "scheduled_at", periodStart, periodEnd);
    const jobsWhere = scopeFilter;

    return Interview.count({
      where,
      include: [
        {
          model: JobApplication,
          attributes: [],
          where: jobsWhere,
          required: true
        }
      ]
    });
  }

  if (goal.metric_type === "offers") {
    const where = mergeDateRangeFilter(
      {
        ...scopeFilter,
        status: { [Op.in]: ["Offer", "Hired"] }
      },
      "updatedAt",
      periodStart,
      periodEnd
    );
    return JobApplication.count({ where });
  }

  if (goal.metric_type === "hires") {
    const where = mergeDateRangeFilter(
      {
        ...scopeFilter,
        status: "Hired"
      },
      "updatedAt",
      periodStart,
      periodEnd
    );
    return JobApplication.count({ where });
  }

  if (goal.metric_type === "responses") {
    const where = mergeDateRangeFilter(
      {
        ...scopeFilter,
        status: { [Op.in]: RESPONSE_STATUSES }
      },
      "updatedAt",
      periodStart,
      periodEnd
    );
    return JobApplication.count({ where });
  }

  return 0;
};

const mapGoalWithProgress = async (goal, userId) => {
  const trackedValue = goal.is_auto_track
    ? await getMetricValue(goal, userId)
    : Number(goal.current_value || 0);
  const targetValue = Number(goal.target_value || 0);
  const progress = targetValue > 0
    ? Number(Math.min(100, ((trackedValue / targetValue) * 100)).toFixed(2))
    : 0;

  const payload = goal.toJSON();
  payload.current_value = trackedValue;
  payload.progress_percentage = progress;
  payload.remaining = Math.max(0, targetValue - trackedValue);
  payload.is_completed = trackedValue >= targetValue && targetValue > 0;

  return payload;
};

export const createGoalService = async (actor, payload) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const data = normalizeGoalPayload(payload);
  await assertWorkspaceAccess(data.workspace_id, actor);

  return Goal.create({
    user_id: userId,
    workspace_id: data.workspace_id || null,
    title: data.title,
    description: data.description || null,
    metric_type: data.metric_type,
    target_value: data.target_value,
    current_value: data.current_value || 0,
    is_auto_track: data.is_auto_track !== undefined ? data.is_auto_track : true,
    period_start: data.period_start,
    period_end: data.period_end,
    status: data.status || "active"
  });
};

export const getGoalsService = async (actor, query = {}) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const where = { user_id: userId };

  if (query.status) {
    const status = String(query.status).trim().toLowerCase();
    if (GOAL_STATUSES.includes(status)) {
      where.status = status;
    }
  }

  const workspaceId = parseIntSafe(query.workspace_id);
  if (workspaceId && workspaceId > 0) {
    await assertWorkspaceAccess(workspaceId, actor);
    where.workspace_id = workspaceId;
  } else if (query.scope === "personal") {
    where.workspace_id = { [Op.is]: null };
  }

  const goals = await Goal.findAll({
    where,
    include: [
      {
        model: Workspace,
        attributes: ["id", "name"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  return Promise.all(goals.map((goal) => mapGoalWithProgress(goal, userId)));
};

export const getGoalByIdService = async (actor, goalId) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const goal = await Goal.findOne({
    where: {
      id: goalId,
      user_id: userId
    },
    include: [
      {
        model: Workspace,
        attributes: ["id", "name"]
      }
    ]
  });

  if (!goal) {
    throw new AppError("Goal not found", 404);
  }

  return mapGoalWithProgress(goal, userId);
};

export const updateGoalService = async (actor, goalId, payload) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const goal = await Goal.findOne({
    where: {
      id: goalId,
      user_id: userId
    }
  });

  if (!goal) {
    throw new AppError("Goal not found", 404);
  }

  const nextData = normalizeGoalPayload(payload, true);
  const nextPeriodStart = nextData.period_start !== undefined
    ? nextData.period_start
    : (goal.period_start ? new Date(goal.period_start) : null);
  const nextPeriodEnd = nextData.period_end !== undefined
    ? nextData.period_end
    : (goal.period_end ? new Date(goal.period_end) : null);

  if (nextPeriodStart && nextPeriodEnd && nextPeriodStart > nextPeriodEnd) {
    throw new AppError("period_start cannot be after period_end", 400);
  }

  if (nextData.workspace_id !== undefined) {
    await assertWorkspaceAccess(nextData.workspace_id, actor);
  }

  await goal.update(nextData);
  return mapGoalWithProgress(goal, userId);
};

export const deleteGoalService = async (actor, goalId) => {
  const userId = actor?.id;
  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const goal = await Goal.findOne({
    where: {
      id: goalId,
      user_id: userId
    }
  });

  if (!goal) {
    throw new AppError("Goal not found", 404);
  }

  await goal.destroy();
  return { message: "Goal deleted successfully" };
};

export const getGoalSummaryService = async (actor, query = {}) => {
  const goals = await getGoalsService(actor, query);
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const completedGoals = goals.filter((goal) => goal.is_completed || goal.status === "completed");
  const overdueGoals = goals.filter((goal) => goal.period_end && new Date(goal.period_end) < new Date() && !goal.is_completed);

  const avgProgress = goals.length
    ? Number((goals.reduce((acc, goal) => acc + Number(goal.progress_percentage || 0), 0) / goals.length).toFixed(2))
    : 0;

  return {
    totals: {
      goals: goals.length,
      active: activeGoals.length,
      completed: completedGoals.length,
      overdue: overdueGoals.length
    },
    averageProgress: avgProgress,
    topGoals: [...goals]
      .sort((a, b) => Number(b.progress_percentage || 0) - Number(a.progress_percentage || 0))
      .slice(0, 5)
  };
};
