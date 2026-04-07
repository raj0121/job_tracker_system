import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

import UserModel from "./User.js";
import JobApplicationModel from "./JobApplication.js";
import AuditLogModel from "./AuditLog.js";
import QueueJobModel from "./QueueJob.js";
import JobStatusHistoryModel from "./JobStatusHistory.js";
import LoginHistoryModel from "./LoginHistory.js";
import DocumentModel from "./Document.js";
import CompanyModel from "./Company.js";
import ContactModel from "./Contact.js";
import ContactInteractionModel from "./ContactInteraction.js";
import InterviewModel from "./Interview.js";
import TenantModel from "./Tenant.js";
import WorkspaceModel from "./Workspace.js";
import WorkspaceMemberModel from "./WorkspaceMember.js";
import SavedFilterModel from "./SavedFilter.js";
import ScheduledReportModel from "./ScheduledReport.js";
import UserSessionModel from "./UserSession.js";
import BillingAccountModel from "./BillingAccount.js";
import GoalModel from "./Goal.js";
import DepartmentModel from "./Department.js";
import DesignationModel from "./Designation.js";
import EmployeeModel from "./Employee.js";
import RoleModel from "./Role.js";
import PermissionModel from "./Permission.js";
import RolePermissionModel from "./RolePermission.js";
import LocationModel from "./Location.js";
import SkillModel from "./Skill.js";
import CandidateModel from "./Candidate.js";
import EnquiryModel from "./Enquiry.js";
import EnquiryContactModel from "./EnquiryContact.js";
import EnquiryAttachmentModel from "./EnquiryAttachment.js";
import RequirementModel from "./Requirement.js";
import IndustryModel from "./Industry.js";
import EducationGroupModel from "./EducationGroup.js";
import EducationTypeModel from "./EducationType.js";
import SpecializationModel from "./Specialization.js";
import KeywordModel from "./Keyword.js";
import EnquirySourceModel from "./EnquirySource.js";
import ReferenceSourceModel from "./ReferenceSource.js";
import CandidateSourceModel from "./CandidateSource.js";

const User = UserModel(sequelize, DataTypes);
const JobApplication = JobApplicationModel(sequelize, DataTypes);
const AuditLog = AuditLogModel(sequelize, DataTypes);
const QueueJob = QueueJobModel(sequelize, DataTypes);
const JobStatusHistory = JobStatusHistoryModel(sequelize, DataTypes);
const LoginHistory = LoginHistoryModel(sequelize, DataTypes);
const Document = DocumentModel(sequelize, DataTypes);
const Company = CompanyModel(sequelize, DataTypes);
const Contact = ContactModel(sequelize, DataTypes);
const ContactInteraction = ContactInteractionModel(sequelize, DataTypes);
const Interview = InterviewModel(sequelize, DataTypes);
const Tenant = TenantModel(sequelize, DataTypes);
const Workspace = WorkspaceModel(sequelize, DataTypes);
const WorkspaceMember = WorkspaceMemberModel(sequelize, DataTypes);
const SavedFilter = SavedFilterModel(sequelize, DataTypes);
const ScheduledReport = ScheduledReportModel(sequelize, DataTypes);
const UserSession = UserSessionModel(sequelize, DataTypes);
const BillingAccount = BillingAccountModel(sequelize, DataTypes);
const Goal = GoalModel(sequelize, DataTypes);
const Department = DepartmentModel(sequelize, DataTypes);
const Designation = DesignationModel(sequelize, DataTypes);
const Employee = EmployeeModel(sequelize, DataTypes);
const Role = RoleModel(sequelize, DataTypes);
const Permission = PermissionModel(sequelize, DataTypes);
const RolePermission = RolePermissionModel(sequelize, DataTypes);
const Location = LocationModel(sequelize, DataTypes);
const Skill = SkillModel(sequelize, DataTypes);
const Candidate = CandidateModel(sequelize, DataTypes);
const Enquiry = EnquiryModel(sequelize, DataTypes);
const EnquiryContact = EnquiryContactModel(sequelize, DataTypes);
const EnquiryAttachment = EnquiryAttachmentModel(sequelize, DataTypes);
const Requirement = RequirementModel(sequelize, DataTypes);
const Industry = IndustryModel(sequelize, DataTypes);
const EducationGroup = EducationGroupModel(sequelize, DataTypes);
const EducationType = EducationTypeModel(sequelize, DataTypes);
const Specialization = SpecializationModel(sequelize, DataTypes);
const ReferenceSource = ReferenceSourceModel(sequelize, DataTypes);
const EnquirySource = EnquirySourceModel(sequelize, DataTypes);
const CandidateSource = CandidateSourceModel(sequelize, DataTypes);
const Keyword = KeywordModel(sequelize, DataTypes);

// Associations
User.hasMany(JobApplication, { foreignKey: "user_id" });
JobApplication.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(AuditLog, { foreignKey: "user_id" });
AuditLog.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(LoginHistory, { foreignKey: "user_id" });
LoginHistory.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Document, { foreignKey: "user_id" });
Document.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Interview, { foreignKey: "user_id" });
Interview.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Company, { foreignKey: "user_id" });
Company.belongsTo(User, { foreignKey: "user_id" });

// Masters Associations
Department.hasMany(Designation, { foreignKey: "department_id" });
Designation.belongsTo(Department, { foreignKey: "department_id" });

Department.hasMany(Employee, { foreignKey: "department_id" });
Employee.belongsTo(Department, { foreignKey: "department_id" });

Designation.hasMany(Employee, { foreignKey: "designation_id" });
Employee.belongsTo(Designation, { foreignKey: "designation_id" });
Role.hasMany(RolePermission, { foreignKey: "role_id" });
RolePermission.belongsTo(Role, { foreignKey: "role_id" });
Permission.hasMany(RolePermission, { foreignKey: "permission_id" });
RolePermission.belongsTo(Permission, { foreignKey: "permission_id" });
Role.belongsToMany(Permission, { through: RolePermission, foreignKey: "role_id", otherKey: "permission_id" });
Permission.belongsToMany(Role, { through: RolePermission, foreignKey: "permission_id", otherKey: "role_id" });

// Candidate Associations
User.hasMany(Candidate, { foreignKey: "created_by" });
Candidate.belongsTo(User, { foreignKey: "created_by" });
User.hasMany(Candidate, { foreignKey: "assigned_to", as: "AssignedCandidates" });
Candidate.belongsTo(User, { foreignKey: "assigned_to", as: "Assignee" });
Requirement.hasMany(Candidate, { foreignKey: "requirement_id" });
Candidate.belongsTo(Requirement, { foreignKey: "requirement_id" });
Department.hasMany(Candidate, { foreignKey: "department_id" });
Candidate.belongsTo(Department, { foreignKey: "department_id" });
Designation.hasMany(Candidate, { foreignKey: "designation_id" });
Candidate.belongsTo(Designation, { foreignKey: "designation_id" });

// Enquiry Associations
User.hasMany(Enquiry, { foreignKey: "created_by" });
Enquiry.belongsTo(User, { foreignKey: "created_by" });
Company.hasMany(Enquiry, { foreignKey: "company_id" });
Enquiry.belongsTo(Company, { foreignKey: "company_id" });

Enquiry.hasMany(EnquiryContact, { foreignKey: "enquiry_id", as: "contacts" });
EnquiryContact.belongsTo(Enquiry, { foreignKey: "enquiry_id" });

Enquiry.hasMany(EnquiryAttachment, { foreignKey: "enquiry_id", as: "attachments" });
EnquiryAttachment.belongsTo(Enquiry, { foreignKey: "enquiry_id" });

// Requirement Associations
User.hasMany(Requirement, { foreignKey: "created_by" });
Requirement.belongsTo(User, { foreignKey: "created_by" });
Company.hasMany(Requirement, { foreignKey: "company_id" });
Requirement.belongsTo(Company, { foreignKey: "company_id" });

// SaaS & Workspace Associations
Tenant.hasMany(User, { foreignKey: "tenant_id", constraints: false });
User.belongsTo(Tenant, { foreignKey: "tenant_id", constraints: false });

Tenant.hasMany(Workspace, { foreignKey: "tenant_id", constraints: false });
Workspace.belongsTo(Tenant, { foreignKey: "tenant_id", constraints: false });

Workspace.hasMany(WorkspaceMember, { foreignKey: "workspace_id" });
WorkspaceMember.belongsTo(Workspace, { foreignKey: "workspace_id" });

User.hasMany(WorkspaceMember, { foreignKey: "user_id" });
WorkspaceMember.belongsTo(User, { foreignKey: "user_id" });

Workspace.hasMany(JobApplication, { foreignKey: "workspace_id", constraints: false });
JobApplication.belongsTo(Workspace, { foreignKey: "workspace_id", constraints: false });

Workspace.hasMany(Company, { foreignKey: "workspace_id", constraints: false });
Company.belongsTo(Workspace, { foreignKey: "workspace_id", constraints: false });

JobApplication.hasMany(JobStatusHistory, { foreignKey: "job_id" });
JobStatusHistory.belongsTo(JobApplication, { foreignKey: "job_id" });

JobApplication.hasMany(Document, { foreignKey: "job_id" });
Document.belongsTo(JobApplication, { foreignKey: "job_id" });

JobApplication.hasMany(Interview, { foreignKey: "job_id" });
Interview.belongsTo(JobApplication, { foreignKey: "job_id" });

Company.hasMany(JobApplication, { foreignKey: "company_id" });
JobApplication.belongsTo(Company, { foreignKey: "company_id" });

Company.hasMany(Contact, { foreignKey: "company_id" });
Contact.belongsTo(Company, { foreignKey: "company_id" });

Company.hasMany(ContactInteraction, { foreignKey: "company_id" });
ContactInteraction.belongsTo(Company, { foreignKey: "company_id" });

Contact.hasMany(ContactInteraction, { foreignKey: "contact_id" });
ContactInteraction.belongsTo(Contact, { foreignKey: "contact_id" });

User.hasMany(ContactInteraction, { foreignKey: "user_id" });
ContactInteraction.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(SavedFilter, { foreignKey: "user_id" });
SavedFilter.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(ScheduledReport, { foreignKey: "user_id" });
ScheduledReport.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(UserSession, { foreignKey: "user_id" });
UserSession.belongsTo(User, { foreignKey: "user_id" });

Tenant.hasOne(BillingAccount, { foreignKey: "tenant_id" });
BillingAccount.belongsTo(Tenant, { foreignKey: "tenant_id" });

User.hasMany(Goal, { foreignKey: "user_id" });
Goal.belongsTo(User, { foreignKey: "user_id" });

Workspace.hasMany(Goal, { foreignKey: "workspace_id", constraints: false });
Goal.belongsTo(Workspace, { foreignKey: "workspace_id", constraints: false });

export {
  sequelize,
  User,
  JobApplication,
  AuditLog,
  QueueJob,
  JobStatusHistory,
  LoginHistory,
  Document,
  Company,
  Contact,
  ContactInteraction,
  Interview,
  Tenant,
  Workspace,
  WorkspaceMember,
  SavedFilter,
  ScheduledReport,
  UserSession,
  BillingAccount,
  Goal,
  Department,
  Designation,
  Employee,
  Role,
  Permission,
  RolePermission,
  Location,
  Skill,
  Candidate,
  Enquiry,
  EnquiryContact,
  EnquiryAttachment,
  Requirement,
  Industry,
  EducationGroup,
  EducationType,
  Specialization,
  Keyword,
  EnquirySource,
  ReferenceSource,
  CandidateSource
};

