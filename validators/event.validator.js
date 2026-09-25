import { z } from 'zod';

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid ISO datetime string',
});

const optionalDateString = z
  .string()
  .optional()
  .refine((val) => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  });

export const createEventSchema = z
  .object({
    name: z.string({ required_error: 'Event name is required' }).min(1, 'Event name is required').max(255),
    place: z.string({ required_error: 'Place is required' }).min(1, 'Place is required').max(255),
    startDatetime: isoDateString,
    endDatetime: optionalDateString,
  })
  .refine(
    (data) => {
      if (data.startDatetime && data.endDatetime) {
        return new Date(data.endDatetime) >= new Date(data.startDatetime);
      }
      return true;
    },
    {
      message: 'End datetime must be after start datetime',
      path: ['endDatetime'],
    }
  );

export const updateEventSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  place: z.string().min(1).max(255).optional(),
  startDatetime: isoDateString.optional(),
  endDatetime: isoDateString.optional(),
});

export const addGigAssignmentSchema = z
  .object({
    gigId: z.number().int().positive().optional(),
    gigIds: z.array(z.number().int().positive()).optional(),
    startDatetime: isoDateString.optional(),
    endDatetime: isoDateString.optional(),
  })
  .refine((data) => data.gigId || (Array.isArray(data.gigIds) && data.gigIds.length > 0), {
    message: 'Staff member selection (gigId or gigIds) is required',
    path: ['gigId'],
  });

export const updateGigAssignmentSchema = z.object({
  startDatetime: isoDateString.optional(),
  endDatetime: isoDateString.optional(),
  actualStartDatetime: isoDateString.optional().nullable(),
  actualEndDatetime: isoDateString.optional().nullable(),
  status: z.enum(['assigned', 'confirmed', 'completed', 'cancelled']).optional(),
});

export const eventFilterSchema = z
  .object({
    status: z.enum(['upcoming', 'ongoing', 'completed']).optional(),
    from: optionalDateString,
    to: optionalDateString,
    managerId: z.coerce.number().int().positive().optional(),
    place: z.string().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    {
      message: 'Invalid date range',
      path: ['from'],
    }
  );

export const gigFilterSchema = eventFilterSchema;

export const createGigProfileSchema = z.object({
  name: z.string({ required_error: 'Full name is required' }).trim().min(1, 'Full name is required').max(255),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).optional().nullable(),
  phone: z.string().trim().max(30, 'Phone number must not exceed 30 characters').optional().nullable(),
});
