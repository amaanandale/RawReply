import { z } from "zod";
import { PHONE_REGEX } from "@/lib/constants";

/**
 * Validates a phone number in E.164 format.
 * Only customers who submit a valid phone number become qualified leads.
 */
export const phoneNumberSchema = z
  .string()
  .min(1, "Phone number is required.")
  .regex(PHONE_REGEX, "Phone number must be in international format (e.g. +1234567890).");

/**
 * Qualified lead schema — the minimum data required to create a lead.
 */
export const qualifiedLeadSchema = z.object({
  igUserId: z.string().min(1, "Instagram user ID is required."),
  igUsername: z.string().min(1, "Instagram username is required."),
  phoneNumber: phoneNumberSchema,
  postId: z.string().min(1, "Post ID is required."),
  qualifiedAt: z.string().datetime().optional(),
});

/**
 * Meta webhook verification query parameters.
 */
export const webhookVerifySchema = z.object({
  "hub.mode": z.literal("subscribe"),
  "hub.verify_token": z.string().min(1),
  "hub.challenge": z.string().min(1),
});

