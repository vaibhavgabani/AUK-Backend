import { generateInvoiceData } from '../services/invoice.service.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getInvoice(req, res, next) {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    return sendError(res, 'Invalid event ID', 400);
  }

  try {
    const data = await generateInvoiceData(req.user, eventId);
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.message === 'EVENT_NOT_FOUND') {
      return sendError(res, 'Event not found', 404);
    }
    return next(err);
  }
}
