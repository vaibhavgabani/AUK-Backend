import { fetchEventsForAdmin } from './event.service.js';
import { fetchAllGigBookings } from './gig.service.js';
import { generateExcelBuffer } from '../utils/excelExporter.js';

export async function exportEventsToExcel(filters) {
  const eventList = await fetchEventsForAdmin(filters);

  const columns = [
    { header: 'Event ID', key: 'eventId', width: 12 },
    { header: 'Event Name', key: 'eventName', width: 30 },
    { header: 'Start Date', key: 'startDate', width: 25 },
    { header: 'End Date', key: 'endDate', width: 25 },
    { header: 'Place', key: 'place', width: 25 },
    { header: 'Manager ID', key: 'managerId', width: 12 },
    { header: 'Manager Name', key: 'managerName', width: 25 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Total Staff', key: 'totalStaff', width: 12 },
    { header: 'Total Hours', key: 'totalHours', width: 15 },
    { header: 'Total Expenses', key: 'totalExpenses', width: 20 },
  ];

  const rows = eventList.map((evt) => ({
    eventId: evt.id,
    eventName: evt.name,
    startDate: evt.startDatetime ? new Date(evt.startDatetime).toISOString() : '',
    endDate: evt.endDatetime ? new Date(evt.endDatetime).toISOString() : '',
    place: evt.place,
    managerId: evt.managerId,
    managerName: evt.managerName,
    status: evt.status,
    totalStaff: evt.totalStaff || 0,
    totalHours: evt.totalHours || 0,
    totalExpenses: evt.totalExpenses || '£0.00',
  }));

  const buffer = await generateExcelBuffer({
    sheetName: 'Events Export',
    columns,
    rows,
  });

  return { buffer, rowCount: rows.length };

}

export async function exportGigsToExcel(filters) {
  const bookingList = await fetchAllGigBookings(filters);

  const columns = [
    { header: 'Assignment ID', key: 'assignmentId', width: 15 },
    { header: 'Event ID', key: 'eventId', width: 12 },
    { header: 'Event Name', key: 'eventName', width: 25 },
    { header: 'Event Start Date', key: 'eventStartDate', width: 22 },
    { header: 'Event End Date', key: 'eventEndDate', width: 22 },
    { header: 'Event Place', key: 'eventPlace', width: 22 },
    { header: 'Manager ID', key: 'managerId', width: 12 },
    { header: 'Manager Name', key: 'managerName', width: 22 },
    { header: 'Gig ID', key: 'gigId', width: 10 },
    { header: 'Gig Name', key: 'gigName', width: 22 },
    { header: 'Gig Email', key: 'gigEmail', width: 25 },
    { header: 'Gig Phone', key: 'gigPhone', width: 18 },
    { header: 'Assignment Start', key: 'assignmentStart', width: 22 },
    { header: 'Assignment End', key: 'assignmentEnd', width: 22 },
    { header: 'Actual Start', key: 'actualStart', width: 22 },
    { header: 'Actual End', key: 'actualEnd', width: 22 },
    { header: 'Assignment Status', key: 'assignmentStatus', width: 18 },
    { header: 'Calculated Hours', key: 'calculatedHours', width: 18 },
  ];

  const rows = bookingList.map((bkg) => ({
    assignmentId: bkg.assignmentId,
    eventId: bkg.eventId,
    eventName: bkg.eventName,
    eventStartDate: bkg.eventStartDatetime ? new Date(bkg.eventStartDatetime).toISOString() : '',
    eventEndDate: bkg.eventEndDatetime ? new Date(bkg.eventEndDatetime).toISOString() : '',
    eventPlace: bkg.eventPlace,
    managerId: bkg.managerId,
    managerName: bkg.managerName,
    gigId: bkg.gigId,
    gigName: bkg.gigName,
    gigEmail: bkg.gigEmail || '',
    gigPhone: bkg.gigPhone || '',
    assignmentStart: bkg.startDatetime ? new Date(bkg.startDatetime).toISOString() : '',
    assignmentEnd: bkg.endDatetime ? new Date(bkg.endDatetime).toISOString() : '',
    actualStart: bkg.actualStartDatetime ? new Date(bkg.actualStartDatetime).toISOString() : '',
    actualEnd: bkg.actualEndDatetime ? new Date(bkg.actualEndDatetime).toISOString() : '',
    assignmentStatus: bkg.status,
    calculatedHours: bkg.calculatedHours,
  }));

  const buffer = await generateExcelBuffer({
    sheetName: 'Gig Bookings Export',
    columns,
    rows,
  });

  return { buffer, rowCount: rows.length };
}
