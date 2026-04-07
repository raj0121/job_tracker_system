import { Op } from "sequelize";
import {
  Company,
  Enquiry,
  EnquiryAttachment,
  EnquiryContact,
  User,
  sequelize
} from "../../models/index.js";
import { AppError } from "../../utils/AppError.js";
import { serializeEnquiry, serializePageResult } from "../../utils/atsSerializers.js";
import { buildPageResult, resolvePagePagination } from "../../utils/pagination.js";

const STATUS_OPTIONS = ["open", "assigned", "closed"];

const normalizeString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const normalizeEmail = (value) => {
  const trimmed = normalizeString(value);
  return trimmed ? trimmed.toLowerCase() : null;
};

const parseOptionalId = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} must be a positive integer`, 400);
  }
  return parsed;
};

const normalizeDate = (value, label) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400);
  }
  return parsed;
};

const normalizeStatus = (value) => {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  return STATUS_OPTIONS.includes(normalized) ? normalized : null;
};

const normalizeUrl = (value, label) => {
  const trimmed = normalizeString(value);
  if (!trimmed) {
    return null;
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch {
    throw new AppError(`${label} must be a valid URL`, 400);
  }
};

const parseContacts = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return [value];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      return [parsed];
    }
  } catch {
    return [];
  }

  return [];
};

const mapContactsPayload = (contacts = []) => {
  return contacts
    .map((contact) => ({
      name: normalizeString(contact?.name),
      mobile: normalizeString(contact?.mobile || contact?.phone),
      email: normalizeEmail(contact?.email),
      designation: normalizeString(contact?.designation)
    }))
    .filter((contact) => {
      if (!contact.name && !contact.mobile && !contact.email && !contact.designation) {
        return false;
      }
      if (!contact.name) {
        throw new AppError("Contact person name is required", 400);
      }
      return true;
    });
};

const resolveCompany = async (payload) => {
  const companyId = parseOptionalId(payload.company_id, "company_id");
  let companyName = normalizeString(payload.company_name);

  let company = null;
  if (companyId) {
    company = await Company.findByPk(companyId, {
      attributes: ["id", "name", "industry"]
    });
    if (!company) {
      throw new AppError("Company not found", 404);
    }
    if (!companyName) {
      companyName = company.name;
    }
  }

  return { companyId, companyName, company };
};

const buildInclude = () => ([
  {
    model: Company,
    attributes: ["id", "name", "industry"]
  },
  {
    model: EnquiryContact,
    as: "contacts",
    attributes: ["id", "name", "mobile", "email", "designation", "createdAt"]
  },
  {
    model: EnquiryAttachment,
    as: "attachments",
    attributes: [
      "id",
      "original_name",
      "file_name",
      "file_path",
      "mime_type",
      "file_size",
      "createdAt"
    ]
  },
  {
    model: User,
    attributes: ["id", "name", "email"]
  }
]);

export const listEnquiriesService = async (query = {}) => {
  const pagination = resolvePagePagination(query, {
    defaultLimit: 50,
    maxLimit: 200
  });

  const where = {};
  const status = normalizeStatus(query.status);
  if (status) {
    where.status = status;
  }

  const companyId = parseOptionalId(query.company_id, "company_id");
  if (companyId) {
    where.company_id = companyId;
  }

  const search = normalizeString(query.search);
  if (search) {
    where[Op.or] = [
      { client_name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { company_name: { [Op.like]: `%${search}%` } },
      { industry: { [Op.like]: `%${search}%` } },
      { reference_source: { [Op.like]: `%${search}%` } }
    ];
  }

  const dateFrom = normalizeDate(query.date_from, "date_from");
  const dateTo = normalizeDate(query.date_to, "date_to");
  if (dateFrom || dateTo) {
    where.enquiry_date = {
      ...(dateFrom ? { [Op.gte]: dateFrom } : {}),
      ...(dateTo ? { [Op.lte]: dateTo } : {})
    };
  }

  const baseQuery = {
    where,
    include: buildInclude(),
    order: [["createdAt", "DESC"]]
  };

  if (pagination.enabled) {
    const { rows, count } = await Enquiry.findAndCountAll({
      ...baseQuery,
      distinct: true,
      limit: pagination.limit,
      offset: pagination.offset
    });
    return serializePageResult(buildPageResult(rows, count, pagination), serializeEnquiry);
  }

  const enquiries = await Enquiry.findAll(baseQuery);
  return enquiries.map(serializeEnquiry);
};

export const getEnquiryByIdService = async (id) => {
  const enquiry = await Enquiry.findByPk(id, {
    include: buildInclude()
  });
  if (!enquiry) {
    throw new AppError("Enquiry not found", 404);
  }
  return serializeEnquiry(enquiry);
};

export const createEnquiryService = async (payload = {}, actor, files = []) => {
  const clientName = normalizeString(payload.client_name || payload.name);
  if (!clientName) {
    throw new AppError("Client name is required", 400);
  }

  const { companyId, companyName, company } = await resolveCompany(payload);

  const enquiryDate = normalizeDate(payload.enquiry_date, "enquiry_date");
  const status = normalizeStatus(payload.status) || "open";

  const createPayload = {
    client_name: clientName,
    contact_number: normalizeString(payload.contact_number || payload.phone),
    email: normalizeEmail(payload.email),
    client_type: normalizeString(payload.client_type),
    country: normalizeString(payload.country),
    state: normalizeString(payload.state),
    city: normalizeString(payload.city),
    zip_code: normalizeString(payload.zip_code),
    address: normalizeString(payload.address),
    company_id: companyId,
    company_name: companyName || company?.name || null,
    industry: normalizeString(payload.industry || company?.industry),
    reference_source: normalizeString(payload.reference_source),
    enquiry_date: enquiryDate || new Date(),
    enquiry_source: normalizeString(payload.enquiry_source),
    resource_profile_link: normalizeUrl(payload.resource_profile_link, "Resource profile link"),
    remarks: normalizeString(payload.remarks),
    status,
    created_by: actor?.id,
    assigned_to: parseOptionalId(payload.assigned_to, "assigned_to")
  };

  if (!actor?.id) {
    throw new AppError("Unauthorized access.", 401);
  }

  const contactsPayload = mapContactsPayload(parseContacts(payload.contacts));

  return sequelize.transaction(async (transaction) => {
    const enquiry = await Enquiry.create(createPayload, { transaction });

    if (contactsPayload.length) {
      await EnquiryContact.bulkCreate(
        contactsPayload.map((contact) => ({
          ...contact,
          enquiry_id: enquiry.id
        })),
        { transaction }
      );
    }

    if (files.length) {
      await EnquiryAttachment.bulkCreate(
        files.map((file) => ({
          enquiry_id: enquiry.id,
          uploaded_by: actor.id,
          file_name: file.filename,
          original_name: file.originalname,
          file_path: file.path,
          mime_type: file.mimetype,
          file_size: file.size
        })),
        { transaction }
      );
    }

    const createdEnquiry = await Enquiry.findByPk(enquiry.id, {
      include: buildInclude(),
      transaction
    });
    return serializeEnquiry(createdEnquiry);
  });
};

export const updateEnquiryService = async (id, payload = {}) => {
  const enquiry = await Enquiry.findByPk(id);
  if (!enquiry) {
    throw new AppError("Enquiry not found", 404);
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(payload, "client_name")) {
    const clientName = normalizeString(payload.client_name);
    if (!clientName) {
      throw new AppError("Client name is required", 400);
    }
    updates.client_name = clientName;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "contact_number")) {
    updates.contact_number = normalizeString(payload.contact_number || payload.phone);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "email")) {
    updates.email = normalizeEmail(payload.email);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "client_type")) {
    updates.client_type = normalizeString(payload.client_type);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "country")) {
    updates.country = normalizeString(payload.country);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "state")) {
    updates.state = normalizeString(payload.state);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "city")) {
    updates.city = normalizeString(payload.city);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "zip_code")) {
    updates.zip_code = normalizeString(payload.zip_code);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "address")) {
    updates.address = normalizeString(payload.address);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "company_id")
    || Object.prototype.hasOwnProperty.call(payload, "company_name")) {
    const { companyId, companyName, company } = await resolveCompany(payload);
    updates.company_id = companyId;
    updates.company_name = companyName || company?.name || null;
    if (Object.prototype.hasOwnProperty.call(payload, "industry")) {
      updates.industry = normalizeString(payload.industry);
    } else if (company?.industry && !updates.industry) {
      updates.industry = company.industry;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "industry")) {
    updates.industry = normalizeString(payload.industry);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "reference_source")) {
    updates.reference_source = normalizeString(payload.reference_source);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "enquiry_date")) {
    updates.enquiry_date = normalizeDate(payload.enquiry_date, "enquiry_date");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "enquiry_source")) {
    updates.enquiry_source = normalizeString(payload.enquiry_source);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "resource_profile_link")) {
    updates.resource_profile_link = normalizeUrl(payload.resource_profile_link, "Resource profile link");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "remarks")) {
    updates.remarks = normalizeString(payload.remarks);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    const status = normalizeStatus(payload.status);
    if (!status) {
      throw new AppError("Invalid enquiry status", 400);
    }
    updates.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "assigned_to")) {
    updates.assigned_to = parseOptionalId(payload.assigned_to, "assigned_to");
  }

  const contactsPayload = Object.prototype.hasOwnProperty.call(payload, "contacts")
    ? mapContactsPayload(parseContacts(payload.contacts))
    : null;

  return sequelize.transaction(async (transaction) => {
    await enquiry.update(updates, { transaction });

    if (contactsPayload) {
      await EnquiryContact.destroy({
        where: { enquiry_id: enquiry.id },
        transaction
      });

      if (contactsPayload.length) {
        await EnquiryContact.bulkCreate(
          contactsPayload.map((contact) => ({
            ...contact,
            enquiry_id: enquiry.id
          })),
          { transaction }
        );
      }
    }

    const updatedEnquiry = await Enquiry.findByPk(enquiry.id, {
      include: buildInclude(),
      transaction
    });
    return serializeEnquiry(updatedEnquiry);
  });
};

export const deleteEnquiryService = async (id) => {
  const enquiry = await Enquiry.findByPk(id);
  if (!enquiry) {
    throw new AppError("Enquiry not found", 404);
  }

  await enquiry.destroy();
  return { deleted: true };
};

export const addEnquiryAttachmentsService = async (enquiryId, actor, files = []) => {
  if (!files.length) {
    throw new AppError("No attachments uploaded", 400);
  }

  const enquiry = await Enquiry.findByPk(enquiryId);
  if (!enquiry) {
    throw new AppError("Enquiry not found", 404);
  }

  if (!actor?.id) {
    throw new AppError("Unauthorized access.", 401);
  }

  await EnquiryAttachment.bulkCreate(
    files.map((file) => ({
      enquiry_id: enquiry.id,
      uploaded_by: actor.id,
      file_name: file.filename,
      original_name: file.originalname,
      file_path: file.path,
      mime_type: file.mimetype,
      file_size: file.size
    }))
  );

  return EnquiryAttachment.findAll({
    where: { enquiry_id: enquiry.id },
    order: [["createdAt", "DESC"]]
  });
};

export const deleteEnquiryAttachmentService = async (enquiryId, attachmentId) => {
  const attachment = await EnquiryAttachment.findOne({
    where: {
      id: attachmentId,
      enquiry_id: enquiryId
    }
  });

  if (!attachment) {
    throw new AppError("Attachment not found", 404);
  }

  await attachment.destroy();
  return { deleted: true };
};
