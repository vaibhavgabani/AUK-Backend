import { exportEventsToExcel, exportGigsToExcel } from '../services/export.service.js';
import { eventFilterSchema, gigFilterSchema } from '../validators/event.validator.js';
import { createAuditLog } from '../utils/audit.js';
import { sendError } from '../utils/response.js';

export async function exportEvents(req, res, next) {
  try {
    const validation = eventFilterSchema.safeParse(req.query);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Invalid filter parameters';
      return sendError(res, firstIssue, 400);
    }

    const filters = validation.data;
    const { buffer } = await exportEventsToExcel(filters);

    // Business Audit logging
    await createAuditLog({
      userId: req.user.id,
      action: 'export',
      entityType: 'event_export',
      entityId: 0,
      newValue: { filters },
      throwOnError: true,
    });

    const isFiltered = Object.values(filters).some((v) => v !== undefined);
    const filename = isFiltered ? 'events-filtered.xlsx' : 'events.xlsx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
}

export async function exportGigs(req, res, next) {
  try {
    const validation = gigFilterSchema.safeParse(req.query);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0]?.message || 'Invalid filter parameters';
      return sendError(res, firstIssue, 400);
    }

    const filters = validation.data;
    const { buffer } = await exportGigsToExcel(filters);

    // Business Audit logging
    await createAuditLog({
      userId: req.user.id,
      action: 'export',
      entityType: 'gig_export',
      entityId: 0,
      newValue: { filters },
      throwOnError: true,
    });

    const isFiltered = Object.values(filters).some((v) => v !== undefined);
    const filename = isFiltered ? 'gig-bookings-filtered.xlsx' : 'gig-bookings.xlsx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
}

export async function logExport(req, res, next) {
  try {
    const { entityType, format, recordCount, activeFilters, selectedColumns } = req.body || {};

    if (!entityType) {
      return sendError(res, 'entityType is required for export audit logging', 400);
    }

    await createAuditLog({
      userId: req.user.id,
      action: 'export',
      entityType: `${entityType}_export`,
      entityId: 0,
      newValue: {
        format: format || 'csv',
        recordCount: recordCount || 0,
        filters: activeFilters || {},
        columns: selectedColumns || [],
        timestamp: new Date().toISOString(),
      },
      throwOnError: true,
    });

    return res.json({ success: true, message: 'Export logged successfully' });
  } catch (err) {
    return next(err);
  }
}
