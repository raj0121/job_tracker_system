import api, { extractData } from "./api";

export const listCompanies = () => api.get("/companies").then(extractData);
