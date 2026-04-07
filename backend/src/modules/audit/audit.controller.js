import { asyncHandler } from "../../utils/asyncHandler.js";
import { AuditLog, User } from "../../models/index.js";

export const getAuditLogs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    action,
    userId
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const offset = (pageNumber - 1) * limitNumber;

  const filter = {};

  if (action) filter.action = action;
  if (userId) filter.user_id = userId;

  const { count, rows } = await AuditLog.findAndCountAll({
    where: filter,
    include: [
      {
        model: User,
        attributes: ["id", "name", "email", "role"]
      }
    ],
    limit: limitNumber,
    offset,
    order: [["createdAt", "DESC"]]
  });

  res.status(200).json({
    success: true,
    totalLogs: count,
    currentPage: pageNumber,
    totalPages: Math.ceil(count / limitNumber),
    data: rows
  });
});
