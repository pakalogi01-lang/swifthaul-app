
import {z} from 'zod';

/**
 * @fileOverview Zod schemas and TypeScript types for traders.
 */

export const CreateTraderInputSchema = z.object({
  fullName: z.string(),
  companyName: z.string(),
  license: z.string(),
  phone: z.string(),
  email: z.string().email(),
  address: z.string(),
  status: z.string(),
});
export type CreateTraderInput = z.infer<typeof CreateTraderInputSchema>;


export const UpdateTraderStatusInputSchema = z.object({
  traderId: z.string(),
  status: z.string(),
});
export type UpdateTraderStatusInput = z.infer<typeof UpdateTraderStatusInputSchema>;


export const UpdateTraderProfileInputSchema = z.object({
    fullName: z.string().optional(),
    companyName: z.string().optional(),
    license: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
});
export type UpdateTraderProfileInput = z.infer<typeof UpdateTraderProfileInputSchema>;
