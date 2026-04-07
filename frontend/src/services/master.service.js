import api, { extractData } from "./api";

export const listDesignations = () => api.get("/masters/designations").then(extractData);
