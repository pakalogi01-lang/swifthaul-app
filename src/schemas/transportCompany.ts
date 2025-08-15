
import {z} from 'zod';

/**
 * @fileOverview Zod schemas and TypeScript types for transport companies.
 */

export const CreateTransportCompanyInputSchema = z.object({
  companyName: z.string(),
  trnNumber: z.string(),
  email: z.string().email(),
  status: z.string(),
});
export type CreateTransportCompanyInput = z.infer<typeof CreateTransportCompanyInputSchema>;

export const UpdateTransportCompanyStatusInputSchema = z.object({
  companyId: z.string(),
  status: z.string(),
});
export type UpdateTransportCompanyStatusInput = z.infer<typeof UpdateTransportCompanyStatusInputSchema>;

export const UpdateTransportCompanyProfileInputSchema = z.object({
    companyName: z.string().optional(),
    trnNumber: z.string().optional(),
    status: z.string().optional(),
});
export type UpdateTransportCompanyProfileInput = z.infer<typeof UpdateTransportCompanyProfileInputSchema>;
