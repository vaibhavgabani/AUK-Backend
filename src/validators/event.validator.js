import { z } from 'zod';

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
  message: 'Invalid ISO datetime string',
});

export const createEventSchema = z
  .object({
    name: z.string({ required_error: 'Event name is required' }).min(1, 'Event name is required').max(255),
    place: z.string({ required_error: 'Place is required' }).min(1, 'Place is required').max(255),
    startDatetime: isoDateString,
    endDatetime: isoDateString.optional().nullable(),
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
