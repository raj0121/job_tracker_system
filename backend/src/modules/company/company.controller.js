import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as companyService from "./company.service.js";

export const createCompany = asyncHandler(async (req, res) => {
  const company = await companyService.createCompanyService(req.user, req.body);
  return successResponse(res, company, "Company created successfully", 201);
});

export const getAllCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.getAllCompaniesService(req.user, req.query);
  return successResponse(res, companies, "Companies fetched successfully");
});

export const getCompanyTrackingOverview = asyncHandler(async (req, res) => {
  const overview = await companyService.getCompanyTrackingOverviewService(req.user, req.query);
  return successResponse(res, overview, "Company tracking overview fetched successfully");
});

export const getCompanyById = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyDetailsService(req.params.id, req.user);
  return successResponse(res, company, "Company details fetched successfully");
});

export const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompanyService(req.params.id, req.body, req.user);
  return successResponse(res, company, "Company updated successfully");
});

export const updateCompanyBlacklist = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompanyBlacklistService(req.params.id, req.body, req.user);
  return successResponse(res, company, "Company blacklist status updated successfully");
});

export const addContact = asyncHandler(async (req, res) => {
  const contact = await companyService.addContactService(req.params.id, req.body, req.user);
  return successResponse(res, contact, "Contact added successfully", 201);
});

export const getCompanyContacts = asyncHandler(async (req, res) => {
  const contacts = await companyService.getContactsByCompanyService(req.params.id, req.user);
  return successResponse(res, contacts, "Recruiter contacts fetched successfully");
});

export const addContactInteraction = asyncHandler(async (req, res) => {
  const interaction = await companyService.addContactInteractionService(
    req.params.id,
    req.params.contactId,
    req.user,
    req.body
  );

  return successResponse(res, interaction, "Recruiter interaction logged successfully", 201);
});

export const getContactInteractions = asyncHandler(async (req, res) => {
  const history = await companyService.getContactInteractionHistoryService(
    req.params.id,
    req.params.contactId,
    req.user,
    req.query.limit
  );

  return successResponse(res, history, "Recruiter interaction history fetched successfully");
});

export const getDueRecruiterFollowUps = asyncHandler(async (req, res) => {
  const followUps = await companyService.getDueRecruiterFollowUpsService(req.user, req.query);
  return successResponse(res, followUps, "Recruiter follow-up queue fetched successfully");
});
