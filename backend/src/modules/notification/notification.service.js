import logger from "../../utils/logger.js";
import { addToQueue } from "../queue/queue.service.js";

const TEMPLATE_MAP = {
  INTERVIEW_REMINDER: {
    channel: "email",
    subject: ({ title, company }) => `Interview Reminder: ${title} at ${company}`,
    body: ({ scheduledFor, interviewerNames }) =>
      `Your interview is scheduled for ${scheduledFor}.${interviewerNames ? ` Panel: ${interviewerNames}.` : ""} Please review your notes and be prepared.`
  },
  STATUS_CHANGE_ALERT: {
    channel: "email",
    subject: ({ company }) => `Application Update: ${company}`,
    body: ({ title, previousStatus, status }) =>
      `Your application for ${title} moved from ${previousStatus || "Unknown"} to ${status}.`
  },
  STATUS_CHANGE: {
    channel: "email",
    subject: ({ company }) => `Application Update: ${company}`,
    body: ({ title, previousStatus, status }) =>
      `Your application for ${title} moved from ${previousStatus || "Unknown"} to ${status}.`
  },
  STALE_JOB_ALERT: {
    channel: "email",
    subject: ({ company }) => `Follow-up reminder: ${company}`,
    body: ({ title, staleDays }) =>
      `No update for ${title} in ${staleDays} days. Consider sending a follow-up.`
  },
  FOLLOW_UP_REMINDER: {
    channel: "email",
    subject: ({ company }) => `Scheduled follow-up: ${company}`,
    body: ({ title, scheduledFor }) =>
      `Follow-up reminder for ${title}. Scheduled trigger: ${scheduledFor}.`
  },
  RECRUITER_FOLLOW_UP_ALERT: {
    channel: "email",
    subject: ({ company, contact }) => `Recruiter follow-up due: ${company}`,
    body: ({ contact, summary, nextFollowUpAt }) =>
      `Follow up with ${contact || "recruiter contact"} for "${summary || "interaction"}". Due at ${nextFollowUpAt || "now"}.`
  },
  EXPORT_REPORT_READY: {
    channel: "email",
    subject: () => "Your report export is ready",
    body: ({ fileName, rows }) =>
      `Export ${fileName || "report.csv"} is generated successfully with ${rows || 0} rows.`
  },
  GENERIC_NOTIFICATION: {
    channel: "email",
    subject: ({ title }) => title || "Notification",
    body: ({ message }) => message || "No message."
  }
};

const normalizeTemplateKey = (value) => {
  const key = (value || "GENERIC_NOTIFICATION").toString().trim().toUpperCase();
  return TEMPLATE_MAP[key] ? key : "GENERIC_NOTIFICATION";
};

const safeTemplateData = (data) => {
  if (!data || typeof data !== "object") {
    return {};
  }

  return data;
};

export const listNotificationTemplates = () => {
  return Object.keys(TEMPLATE_MAP).map((key) => ({
    key,
    channel: TEMPLATE_MAP[key].channel
  }));
};

export const renderNotificationTemplate = (templateKey, data = {}) => {
  const key = normalizeTemplateKey(templateKey);
  const template = TEMPLATE_MAP[key];
  const payload = safeTemplateData(data);

  return {
    templateKey: key,
    channel: template.channel,
    subject: template.subject(payload),
    body: template.body(payload)
  };
};

export const queueNotificationJob = async ({
  userId,
  template,
  data = {},
  scheduledFor = null,
  delayMs = null,
  maxAttempts = 3,
  metadata = {},
  transaction = null
}) => {
  return addToQueue({
    userId,
    type: "SEND_NOTIFICATION",
    maxAttempts,
    scheduledFor,
    delayMs,
    transaction,
    payload: {
      template: normalizeTemplateKey(template),
      data: safeTemplateData(data),
      metadata
    }
  });
};

export const simulateEmailDelivery = async ({
  userId,
  templateKey,
  rendered,
  metadata = {},
  queueJobId = null
}) => {
  const simulatedMessageId = `sim-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  logger.info({
    message: "Simulated email dispatch",
    queueJobId,
    userId,
    template: templateKey,
    email: {
      subject: rendered.subject,
      body: rendered.body
    },
    metadata
  });

  return {
    delivered: true,
    provider: "simulated-email",
    messageId: simulatedMessageId,
    deliveredAt: new Date().toISOString(),
    template: templateKey,
    channel: rendered.channel
  };
};
