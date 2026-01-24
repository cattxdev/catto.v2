/**
 * Validation schemas for Temp Voice configuration
 */

import { z } from 'zod';

export const tempVoiceConfigSchema = z.object({
  enabled: z.boolean().default(true),
  joinChannelIds: z
    .array(z.string().regex(/^\d{17,19}$/))
    .min(1, 'At least one join channel is required'),
  namingScheme: z.enum(['username', 'displayname', 'sequential', 'custom']).default('username'),
  customNamingPattern: z.string().nullable().optional(),
  userLimit: z.number().int().min(0).max(99).default(0),
  bitrate: z.number().int().min(8000).max(384000).default(64000),
  defaultCategoryId: z
    .string()
    .regex(/^\d{17,19}$/)
    .nullable()
    .optional(),
  autoDeleteEmpty: z.boolean().default(true),
  deleteEmptyAfterMs: z.number().int().min(0).default(60000),
  autoDeleteOwnerLeave: z.boolean().default(true),
  deleteOwnerLeaveAfterMs: z.number().int().min(0).default(60000),
  allowOwnerTransfer: z.boolean().default(true),
  allowOwnerManagement: z.boolean().default(true),
  maxChannelsPerUser: z.number().int().min(1).max(10).default(1),
  logChannelId: z
    .string()
    .regex(/^\d{17,19}$/)
    .nullable()
    .optional(),
});

export type TempVoiceConfigInput = z.infer<typeof tempVoiceConfigSchema>;
