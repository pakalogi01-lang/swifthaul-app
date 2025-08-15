
import {z} from 'zod';
import { GeoPoint } from 'firebase/firestore';

/**
 * @fileOverview Zod schemas and TypeScript types for drivers.
 */

export const CreateDriverInputSchema = z.object({
  fullName: z.string(),
  mobile: z.string(),
  email: z.string().email().optional(),
  passport: z.string(),
  vehicleReg: z.string(),
  vehicleCat: z.string(),
  trailerLength: z.string().optional(),
  trailerType: z.string().optional(),
  status: z.string(),
  companyId: z.string().optional(),
  passportCopyUrl: z.string().optional(),
  idCopyUrl: z.string().optional(),
  licenseFrontUrl: z.string().optional(),
  licenseBackUrl: z.string().optional(),
  mulkiaFrontUrl: z.string().optional(),
  mulkiaBackUrl: z.string().optional(),
});
export type CreateDriverInput = z.infer<typeof CreateDriverInputSchema>;


export const UpdateDriverStatusInputSchema = z.object({
  driverId: z.string(),
  status: z.string(),
});
export type UpdateDriverStatusInput = z.infer<typeof UpdateDriverStatusInputSchema>;

export const UpdateDriverProfileInputSchema = z.object({
  fullName: z.string().optional(),
  mobile: z.string().optional(),
  passport: z.string().optional(),
  vehicleReg: z.string().optional(),
  vehicleCat: z.string().optional(),
  trailerLength: z.string().optional(),
  trailerType: z.string().optional(),
  passportCopyUrl: z.string().optional(),
  idCopyUrl: z.string().optional(),
  licenseFrontUrl: z.string().optional(),
  licenseBackUrl: z.string().optional(),
  mulkiaFrontUrl: z.string().optional(),
  mulkiaBackUrl: z.string().optional(),
  currentLocation: z.custom<GeoPoint>().optional(),
});
export type UpdateDriverProfileInput = z.infer<typeof UpdateDriverProfileInputSchema>;
