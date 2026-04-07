import { Tenant, User } from "../../models/index.js";

export const findUserById = async (userId, options = {}) => {
  return User.findByPk(userId, options);
};

export const updateUserById = async (userId, payload, options = {}) => {
  const user = await User.findByPk(userId);
  if (!user) {
    return null;
  }

  await user.update(payload, options);
  return user;
};

export const findTenantById = async (tenantId) => {
  if (!tenantId) {
    return null;
  }

  return Tenant.findByPk(tenantId, {
    attributes: ["id", "name", "plan", "subscription_status", "is_active"]
  });
};
