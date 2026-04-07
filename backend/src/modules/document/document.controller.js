import { asyncHandler } from "../../utils/asyncHandler.js";
import { successResponse } from "../../utils/apiResponse.js";
import * as documentService from "./document.service.js";
import { logAction } from "../audit/audit.service.js";

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const document = await documentService.uploadDocumentService(
    req.user,
    req.body.job_id,
    req.file,
    req.body.file_type
  );

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "UPLOAD_DOCUMENT",
    resource: "Document",
    resourceId: document.id
  });

  return successResponse(res, document, "File uploaded successfully", 201);
});

export const getDocuments = asyncHandler(async (req, res) => {
  const documents = await documentService.getDocumentsService(req.user.id, req.query);
  return successResponse(res, documents, "Documents fetched successfully");
});

export const getResumeLibrary = asyncHandler(async (req, res) => {
  const library = await documentService.getResumeLibraryService(req.user.id, req.query);
  return successResponse(res, library, "Resume library fetched successfully");
});

export const downloadDocument = asyncHandler(async (req, res) => {
  const { filePath, fileName, document } = await documentService.getDocumentDownloadPayloadService(
    req.params.id,
    req.user.id
  );

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "DOWNLOAD_DOCUMENT",
    resource: "Document",
    resourceId: document.id
  });

  return res.download(filePath, fileName);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const result = await documentService.deleteDocumentService(req.params.id, req.user.id);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "DELETE_DOCUMENT",
    resource: "Document",
    resourceId: req.params.id
  });

  return successResponse(res, null, result.message);
});

export const setDocumentActive = asyncHandler(async (req, res) => {
  const document = await documentService.setDocumentActiveService(req.params.id, req.user.id);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "SET_DOCUMENT_ACTIVE",
    resource: "Document",
    resourceId: document.id
  });

  return successResponse(res, document, "Document activated successfully");
});

export const mapDocumentToJob = asyncHandler(async (req, res) => {
  const document = await documentService.mapDocumentToJobService(req.params.id, req.user, req.body.job_id);

  await logAction({
    userId: req.user.id,
    role: req.user.role,
    action: "MAP_DOCUMENT_TO_JOB",
    resource: "Document",
    resourceId: document.id
  });

  return successResponse(res, document, "Document mapped to job successfully");
});
