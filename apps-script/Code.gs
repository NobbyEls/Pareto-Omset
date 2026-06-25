/**
 * Pareto Omset — Google Apps Script Web App
 * 
 * Membaca data langsung dari Spreadsheet (BUKAN dari published CSV)
 * sehingga data selalu real-time tanpa delay cache Google Sheets.
 *
 * Deploy sebagai Web App:
 * 1. Buka https://script.google.com
 * 2. Buat project baru, paste kode ini
 * 3. Ganti SPREADSHEET_ID dengan ID spreadsheet kamu
 * 4. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL deployment, paste ke dashboard (SCRIPT_URL di dataset.ts)
 */

// ============ KONFIGURASI ============
// Ganti dengan ID Spreadsheet kamu (dari URL: docs.google.com/spreadsheets/d/{ID}/edit)
const SPREADSHEET_ID = "1pzL4-ZFNT-8Uo29MqykmP7QQrIL2BLNringLeShFQlY";

// GID (sheet tab ID) — sesuaikan dengan tab sheet kamu
const SHEETS = {
  omset: 1311218554,    // Tab data omset utama
  jasa: 1300836220,     // Tab data jasa
  brand: 1623559016,    // Tab data brand
};
// =====================================

function doGet(e) {
  const params = e.parameter || {};
  const type = params.type || "omset"; // omset | jasa | brand
  
  const gid = SHEETS[type];
  if (!gid) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: "Invalid type. Use: omset, jasa, or brand" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    
    // Find sheet by gid
    let targetSheet = null;
    for (const sheet of sheets) {
      if (sheet.getSheetId() === gid) {
        targetSheet = sheet;
        break;
      }
    }
    
    if (!targetSheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: `Sheet with gid ${gid} not found` })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Get all data as CSV
    const data = targetSheet.getDataRange().getValues();
    const csv = data.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined || cell === "") return "";
        const str = String(cell);
        // Quote if contains comma, newline, or quotes
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }).join(",")
    ).join("\n");

    return ContentService.createTextOutput(csv)
      .setMimeType(ContentService.MimeType.TEXT);
      
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
