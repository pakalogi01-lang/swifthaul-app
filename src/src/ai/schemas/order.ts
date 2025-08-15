
import {z} from 'zod';

/**
 * @fileoverview Zod schemas for order-related data.
 *
 * This file defines the Zod schemas for creating orders and updating their status.
 * These schemas are used for input validation in server actions and AI flows.
 *
 * - CreateOrderInput: The input for creating a new order.
 * - UpdateOrderStatusInput: The input for updating the status of an existing order.
 */

export const CreateOrderInputSchema = z.object({
  from: z.string(),
  to: z.string(),
  price: z.string(),
  weight: z.string(),
  material: z.string(),
  vehicleType: z.string(),
  trailerLength: z.string().optional(),
  trailerType: z.string().optional(),
  tollPaidBySender: z.boolean(),
  waitingChargesPaidBySender: z.boolean(),
  status: z.string(),
  traderId: z.string(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const UpdateOrderStatusInputSchema = z.object({
  orderId: z.string(),
  status: z.string(),
  driverId: z.string().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusInputSchema>;


export const CreatePaymentRequestInputSchema = z.object({
  orderId: z.string(),
  driverId: z.string(),
  driverName: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  requestType: z.enum(['Advance', 'Final']),
  amount: z.number(),
});
export type CreatePaymentRequestInput = z.infer<typeof CreatePaymentRequestInputSchema>;


export const RecordPayoutInputSchema = z.object({
  orderId: z.string(),
  requestId: z.string(),
  amount: z.number(),
});
export type RecordPayoutInput = z.infer<typeof RecordPayoutInputSchema>;
