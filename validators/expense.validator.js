import { z } from 'zod';

export const createExpenseSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must not exceed 255 characters'),
  amount: z
    .number({ required_error: 'Amount is required' })
    .min(0, 'Amount must be greater than or equal to 0')
    .finite('Amount must be a valid finite number'),
  currency: z
    .string({ required_error: 'Currency is required' })
    .min(1, 'Currency is required')
    .max(10, 'Currency code must not exceed 10 characters')
    .default('GBP'),
});export const updateExpenseSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title must not exceed 255 characters')
    .optional(),
  amount: z
    .number()
    .min(0, 'Amount must be greater than or equal to 0')
    .finite('Amount must be a valid finite number')
    .optional(),
  currency: z
    .string()
    .min(1, 'Currency is required')
    .max(10, 'Currency code must not exceed 10 characters')
    .optional(),
});
