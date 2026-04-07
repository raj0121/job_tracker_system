import api, { extractData } from "./api";

export const listRequirements = (params) => api.get("/platform/requirements", { params }).then(extractData);
export const getRequirement = (id) => api.get(`/platform/requirements/${id}`).then(extractData);
export const createRequirement = (payload) => api.post("/platform/requirements", payload).then(extractData);
export const updateRequirement = ({ id, payload }) => api.patch(`/platform/requirements/${id}`, payload).then(extractData);
export const deleteRequirement = (id) => api.delete(`/platform/requirements/${id}`).then(extractData);
export const listAssignableUsers = () => api.get("/platform/users").then(extractData);
