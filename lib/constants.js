/**
 * Application-wide constants for RawReply.
 */

/** Application metadata */
export const APP_NAME = "RawReply";
export const APP_DESCRIPTION =
  "Instagram comment-to-DM automation and qualified lead collection.";
export const APP_TAGLINE =
  "Turn Instagram Conversations Into Qualified Leads.";

/** Meta / Instagram messaging window (in hours) */
export const META_MESSAGING_WINDOW_HOURS = 24;

/** Phone number validation — E.164 international format */
export const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

/** Lead export statuses */
export const LEAD_STATUS = {
  QUALIFIED: "qualified",
  EXPORTED: "exported",
};

/** DM workflow step types */
export const WORKFLOW_STEP_TYPES = {
  MESSAGE: "message",
  QUESTION: "question",
  PHONE_REQUEST: "phone_request",
};

/**
 * Team roles and permissions
 */
export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
};

export const ROLE_DETAILS = {
  [ROLES.OWNER]: {
    name: "Owner",
    description: "Full organization access, billing, team management, and integrations.",
  },
  [ROLES.ADMIN]: {
    name: "Admin",
    description: "Manage automations, accounts, integrations, and access qualified leads.",
  },
  [ROLES.MEMBER]: {
    name: "Member",
    description: "View automations, Instagram accounts, and assigned qualified leads.",
  },
};

/**
 * Supported integrations
 */
export const INTEGRATIONS = {
  INSTAGRAM: {
    id: "instagram",
    name: "Instagram / Meta",
    category: "Social Platform",
    description:
      "Connect your Instagram Professional (Business or Creator) account via Facebook Graph API to listen for post comments and send automated direct messages.",
    status: "not_connected",
    required: true,
  },
  EXCEL: {
    id: "excel",
    name: "Microsoft Excel",
    category: "Spreadsheet Destination",
    description:
      "Automatically export newly qualified leads who provide a valid mobile number directly to a configured Excel workbook.",
    status: "coming_soon",
    required: false,
  },
  GOOGLE_SHEETS: {
    id: "google_sheets",
    name: "Google Sheets",
    category: "Spreadsheet Destination",
    description:
      "Sync qualified leads into a Google Sheet in real-time as soon as the customer completes phone verification.",
    status: "coming_soon",
    required: false,
  },
};
