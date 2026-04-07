import { AuditLog } from "../../models/index.js";

export const logAction = async (
  {
    userId,
    role,
    action,
    resource,
    resourceId
  },
  transaction = null
) => {
  return await AuditLog.create(
    {
      user_id: userId,
      role,
      action,
      resource,
      resource_id: resourceId
    },
    { transaction }
  );
};
