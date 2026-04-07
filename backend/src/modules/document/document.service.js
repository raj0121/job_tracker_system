import fs from "fs";
import path from "path";
import { Document, JobApplication, sequelize } from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { isWorkspaceMember } from "../workspace/workspace.service.js";

const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const uploadDocumentService = async (actor, jobId, file, fileType = "resume") => {
  const userId = actor?.id;

  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  return sequelize.transaction(async (transaction) => {
    const resolvedJobId = jobId ? Number(jobId) : null;

    if (resolvedJobId) {
      const job = await JobApplication.findByPk(resolvedJobId, { transaction });
      if (!job) {
        throw new AppError("Job not found", 404);
      }

      const hasAccess = job.user_id === userId
        || (job.workspace_id ? await isWorkspaceMember(job.workspace_id, actor) : false);
      if (!hasAccess) {
        throw new AppError("Access denied to target job", 403);
      }
    }

    const maxVersion = await Document.max("version", {
      where: {
        user_id: userId,
        job_id: resolvedJobId || null,
        file_type: fileType
      },
      transaction
    });

    const shouldDeactivatePrior = fileType !== "other";
    if (shouldDeactivatePrior) {
      await Document.update(
        { is_active: false },
        {
          where: {
            user_id: userId,
            job_id: resolvedJobId || null,
            file_type: fileType,
            is_active: true
          },
          transaction
        }
      );
    }

    const version = Number(maxVersion || 0) + 1;

    return Document.create(
      {
        user_id: userId,
        job_id: resolvedJobId || null,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_type: fileType,
        mime_type: file.mimetype,
        file_size: file.size,
        version,
        is_active: true
      },
      { transaction }
    );
  });
};

export const getDocumentsService = async (userId, query = {}) => {
  const where = { user_id: userId };

  if (query.job_id) {
    where.job_id = query.job_id;
  }

  if (query.file_type) {
    where.file_type = query.file_type;
  }

  if (query.include_inactive !== "true") {
    where.is_active = true;
  }

  return Document.findAll({
    where,
    order: [
      ["file_type", "ASC"],
      ["version", "DESC"],
      ["createdAt", "DESC"]
    ]
  });
};

export const getDocumentByIdService = async (docId, userId) => {
  const document = await Document.findOne({
    where: { id: docId, user_id: userId }
  });

  if (!document) {
    throw new AppError("Document not found", 404);
  }

  return document;
};

export const getDocumentDownloadPayloadService = async (docId, userId) => {
  const document = await getDocumentByIdService(docId, userId);

  if (!fs.existsSync(document.file_path)) {
    throw new AppError("File no longer available", 410);
  }

  return {
    filePath: document.file_path,
    fileName: document.original_name,
    document
  };
};

export const deleteDocumentService = async (docId, userId) => {
  const document = await getDocumentByIdService(docId, userId);
  await document.destroy();

  return { message: "Document deleted successfully" };
};

export const setDocumentActiveService = async (docId, userId) => {
  return sequelize.transaction(async (transaction) => {
    const document = await Document.findOne({
      where: { id: docId, user_id: userId },
      transaction
    });

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    await Document.update(
      { is_active: false },
      {
        where: {
          user_id: userId,
          file_type: document.file_type,
          job_id: document.job_id || null,
          is_active: true
        },
        transaction
      }
    );

    await document.update({ is_active: true }, { transaction });
    return document;
  });
};

export const mapDocumentToJobService = async (docId, actor, jobId) => {
  const userId = actor?.id;

  if (!userId) {
    throw new AppError("Unauthorized access.", 401);
  }

  const parsedJobId = Number(jobId);
  if (!Number.isInteger(parsedJobId) || parsedJobId <= 0) {
    throw new AppError("job_id must be a positive integer", 400);
  }

  return sequelize.transaction(async (transaction) => {
    const document = await Document.findOne({
      where: { id: docId, user_id: userId },
      transaction
    });
    if (!document) {
      throw new AppError("Document not found", 404);
    }

    const job = await JobApplication.findByPk(parsedJobId, { transaction });
    if (!job) {
      throw new AppError("Job not found", 404);
    }

    const hasAccess = job.user_id === userId
      || (job.workspace_id ? await isWorkspaceMember(job.workspace_id, actor) : false);
    if (!hasAccess) {
      throw new AppError("Access denied to target job", 403);
    }

    if (document.file_type !== "other") {
      await Document.update(
        { is_active: false },
        {
          where: {
            user_id: userId,
            job_id: parsedJobId,
            file_type: document.file_type,
            is_active: true
          },
          transaction
        }
      );
    }

    await document.update(
      {
        job_id: parsedJobId,
        access_level: job.workspace_id ? "workspace" : "private",
        is_active: true
      },
      { transaction }
    );

    return document;
  });
};

export const getResumeLibraryService = async (userId, query = {}) => {
  const includeInactive = query.include_inactive === "true";

  const where = {
    user_id: userId,
    file_type: "resume"
  };

  if (!includeInactive) {
    where.is_active = true;
  }

  const resumes = await Document.findAll({
    where,
    include: [
      {
        model: JobApplication,
        attributes: ["id", "company_name", "job_title", "status"]
      }
    ],
    order: [
      ["job_id", "ASC"],
      ["version", "DESC"],
      ["createdAt", "DESC"]
    ]
  });

  const globalResumes = resumes.filter((item) => !item.job_id);
  const mappedResumes = resumes.filter((item) => Boolean(item.job_id));

  return {
    totals: {
      globalResumes: globalResumes.length,
      mappedResumes: mappedResumes.length,
      activeResumes: resumes.filter((item) => item.is_active).length
    },
    globalResumes,
    mappedResumes
  };
};
