import api, { extractData } from "./api";

export const listEnquiries = (params) => api.get("/platform/enquiries", { params }).then(extractData);
export const getEnquiry = (id) => api.get(`/platform/enquiries/${id}`).then(extractData);
export const createEnquiry = (payload) => api.post("/platform/enquiries", payload).then(extractData);
export const updateEnquiry = ({ id, payload }) => api.patch(`/platform/enquiries/${id}`, payload).then(extractData);
export const deleteEnquiry = (id) => api.delete(`/platform/enquiries/${id}`).then(extractData);
export const uploadEnquiryAttachments = ({ id, payload }) => api.post(`/platform/enquiries/${id}/attachments`, payload).then(extractData);
