import { Op } from "sequelize";
import { Company, Contact, ContactInteraction, JobApplication } from "../../models/index.js";
import logger from "../../utils/logger.js";
import { queueNotificationJob } from "../notification/notification.service.js";

const STALE_DAYS = 14;
const APPLIED_AUTO_MOVE_DAYS = 10;
const FOLLOW_UP_LOOKAHEAD_HOURS = 24;

export const detectStaleJobsService = async () => {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);

  const staleJobs = await JobApplication.findAll({
    where: {
      status: { [Op.notIn]: ["Offer", "Hired", "Rejected"] },
      updatedAt: { [Op.lt]: staleDate },
      deletedAt: null
    }
  });

  for (const job of staleJobs) {
    await queueNotificationJob({
      userId: job.user_id,
      template: "STALE_JOB_ALERT",
      data: {
        company: job.company_name,
        title: job.job_title,
        staleDays: STALE_DAYS
      },
      metadata: {
        source: "stale-job-detection",
        jobId: job.id
      }
    });
  }

  logger.info({ message: "Stale job detection complete", count: staleJobs.length });
  return staleJobs.length;
};

export const runAutomationRulesService = async () => {
  const movedStatuses = [];
  const remindersQueued = [];
  const recruiterFollowUpsQueued = [];

  const appliedThreshold = new Date();
  appliedThreshold.setDate(appliedThreshold.getDate() - APPLIED_AUTO_MOVE_DAYS);

  const staleAppliedJobs = await JobApplication.findAll({
    where: {
      status: "Applied",
      updatedAt: { [Op.lt]: appliedThreshold },
      deletedAt: null
    }
  });

  for (const job of staleAppliedJobs) {
    const previousStatus = job.status;
    await job.update({ status: "Screening" }, { actorId: 0 });
    movedStatuses.push(job.id);

    await queueNotificationJob({
      userId: job.user_id,
      template: "STATUS_CHANGE_ALERT",
      data: {
        company: job.company_name,
        title: job.job_title,
        previousStatus,
        status: "Screening"
      },
      metadata: {
        source: "workflow-auto-status",
        jobId: job.id
      }
    });
  }

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - STALE_DAYS);

  const noResponseJobs = await JobApplication.findAll({
    where: {
      status: { [Op.notIn]: ["Offer", "Hired", "Rejected"] },
      updatedAt: { [Op.lt]: staleDate },
      deletedAt: null
    }
  });

  for (const job of noResponseJobs) {
    const reminder = await queueNotificationJob({
      userId: job.user_id,
      template: "FOLLOW_UP_REMINDER",
      data: {
        company: job.company_name,
        title: job.job_title,
        staleDays: STALE_DAYS,
        scheduledFor: new Date().toISOString()
      },
      metadata: {
        source: "workflow-follow-up",
        jobId: job.id
      }
    });

    remindersQueued.push(reminder.id);
  }

  const followUpThreshold = new Date(Date.now() + FOLLOW_UP_LOOKAHEAD_HOURS * 60 * 60 * 1000);
  const dueRecruiterFollowUps = await ContactInteraction.findAll({
    where: {
      next_follow_up_at: {
        [Op.lte]: followUpThreshold
      },
      follow_up_notified_at: {
        [Op.is]: null
      }
    },
    include: [
      { model: Company, attributes: ["id", "name"] },
      { model: Contact, attributes: ["id", "name", "role", "email"] }
    ],
    order: [["next_follow_up_at", "ASC"]],
    limit: 300
  });

  for (const interaction of dueRecruiterFollowUps) {
    const reminder = await queueNotificationJob({
      userId: interaction.user_id,
      template: "RECRUITER_FOLLOW_UP_ALERT",
      data: {
        company: interaction.Company?.name || "Unknown company",
        contact: interaction.Contact?.name || "Recruiter",
        summary: interaction.summary,
        nextFollowUpAt: interaction.next_follow_up_at?.toISOString?.() || null
      },
      metadata: {
        source: "workflow-recruiter-follow-up",
        companyId: interaction.company_id,
        contactId: interaction.contact_id,
        interactionId: interaction.id
      }
    });

    await interaction.update({
      follow_up_notified_at: new Date()
    });

    recruiterFollowUpsQueued.push(reminder.id);
  }

  return {
    autoMovedCount: movedStatuses.length,
    followUpReminders: remindersQueued.length,
    recruiterFollowUps: recruiterFollowUpsQueued.length,
    movedStatuses,
    reminderJobIds: remindersQueued,
    recruiterFollowUpJobIds: recruiterFollowUpsQueued
  };
};
