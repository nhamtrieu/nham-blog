import { z } from "zod";

import { NewsletterSubscriberStatus } from "@/entities/newsletter-subscriber.entity";
import {
  type ValidationResult,
  validateWithSchema,
} from "@/validators/validation";

const SUBSCRIBE_MESSAGE = "Newsletter subscribe payload is invalid.";
const UNSUBSCRIBE_MESSAGE = "Newsletter unsubscribe payload is invalid.";
const TEST_SEND_MESSAGE = "Newsletter test-send payload is invalid.";

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  source: z
    .string()
    .trim()
    .max(64, "Source must be at most 64 characters.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const newsletterUnsubscribeSchema = z.object({
  token: z.string().trim().min(1, "Unsubscribe token is required."),
});

export const newsletterTestSendSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").transform((value) => value.toLowerCase()),
});

export const newsletterSubscriberListQuerySchema = z.object({
  status: z.nativeEnum(NewsletterSubscriberStatus).optional(),
  search: z.string().trim().max(320).optional(),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
export type NewsletterUnsubscribeInput = z.infer<typeof newsletterUnsubscribeSchema>;
export type NewsletterTestSendInput = z.infer<typeof newsletterTestSendSchema>;
export type NewsletterSubscriberListQuery = z.infer<typeof newsletterSubscriberListQuerySchema>;

export function validateNewsletterSubscribeInput(
  input: unknown
): ValidationResult<NewsletterSubscribeInput> {
  return validateWithSchema(newsletterSubscribeSchema, input, SUBSCRIBE_MESSAGE);
}

export function validateNewsletterUnsubscribeInput(
  input: unknown
): ValidationResult<NewsletterUnsubscribeInput> {
  return validateWithSchema(newsletterUnsubscribeSchema, input, UNSUBSCRIBE_MESSAGE);
}

export function validateNewsletterTestSendInput(
  input: unknown
): ValidationResult<NewsletterTestSendInput> {
  return validateWithSchema(newsletterTestSendSchema, input, TEST_SEND_MESSAGE);
}
