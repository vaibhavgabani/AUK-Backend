import { z } from 'zod';

export const createManagerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).min(1, 'Name is required').max(255),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email format').max(255),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128),
  phone: z.string().max(30, 'Phone number must not exceed 30 characters').optional().nullable(),
});
