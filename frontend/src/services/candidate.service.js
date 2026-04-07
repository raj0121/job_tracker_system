import api, { extractData } from "./api";

export const listCandidates = (params) => api.get("/platform/candidates", { params }).then(extractData);
export const createCandidate = (payload) => api.post("/platform/candidates", payload).then(extractData);
export const updateCandidate = ({ id, payload }) => api.patch(`/platform/candidates/${id}`, payload).then(extractData);
export const listAssignableRequirements = () => api.get("/platform/requirements").then(extractData);
