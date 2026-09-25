import ExcelJS from 'exceljs';

/**
 * Creates an ExcelJS Workbook Buffer from column metadata and row data.
 *
 * @param {object} params
 * @param {string} [params.sheetName='Sheet1'] - Worksheet name
 * @param {Array<{header: string, key: string, width?: number}>} params.columns - Column definitions
 * @param {Array<object>} params.rows - Array of row objects matching column keys
 * @returns {Promise<Buffer>} Excel XLSX file buffer
 */
export async function generateExcelBuffer({ sheetName = 'Sheet1', columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'EventRoster System';
  workbook.lastModifiedBy = 'EventRoster System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }));

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  return await workbook.xlsx.writeBuffer();
}
