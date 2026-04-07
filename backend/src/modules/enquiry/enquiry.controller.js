import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as enquiryService from "./enquiry.service.js";

export const getEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await enquiryService.listEnquiriesService(req.query);
  return successResponse(res, enquiries, "Enquiries fetched successfully");
});

export const getEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.getEnquiryByIdService(req.params.id);
  return successResponse(res, enquiry, "Enquiry fetched successfully");
});

export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.createEnquiryService(req.body, req.user, req.files || []);
  return successResponse(res, enquiry, "Enquiry created successfully", 201);
});

export const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.updateEnquiryService(req.params.id, req.body);
  return successResponse(res, enquiry, "Enquiry updated successfully");
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const result = await enquiryService.deleteEnquiryService(req.params.id);
  return successResponse(res, result, "Enquiry deleted successfully");
});

export const addEnquiryAttachments = asyncHandler(async (req, res) => {
  const attachments = await enquiryService.addEnquiryAttachmentsService(
    req.params.id,
    req.user,
    req.files || []
  );
  return successResponse(res, attachments, "Attachments added successfully", 201);
});

export const deleteEnquiryAttachment = asyncHandler(async (req, res) => {
  const result = await enquiryService.deleteEnquiryAttachmentService(
    req.params.id,
    req.params.attachmentId
  );
  return successResponse(res, result, "Attachment deleted successfully");
});
