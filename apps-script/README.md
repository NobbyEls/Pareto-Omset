# Pareto Omset — Apps Script Web App

Script ini membaca data **langsung dari Google Spreadsheet** (bukan dari Published CSV) sehingga data selalu real-time tanpa delay cache Google Sheets.

## Kenapa Perlu Ini?

Google Sheets Published CSV (`/pub?output=csv`) punya **server-side cache 5-60 menit**. Artinya setelah edit spreadsheet, dashboard bisa menampilkan data lama selama beberapa menit. Apps Script Web App membaca langsung dari SpreadsheetApp API — **selalu fresh**.

## Cara Deploy

### 1. Buka Google Apps Script
- Pergi ke https://script.google.com
- Klik "New Project"

### 2. Paste Kode
- Hapus isi `Code.gs` default
- Copy-paste isi file `Code.gs` dari folder ini
- **PENTING:** Ganti `SPREADSHEET_ID` dengan ID spreadsheet kamu:
  ```
  const SPREADSHEET_ID = "1abc123...xyz"; // dari URL spreadsheet
  ```
  ID bisa dilihat di URL: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### 3. Deploy
- Klik **Deploy** > **New deployment**
- Type: **Web app**
- Settings:
  - Execute as: **Me** (akun kamu)
  - Who has access: **Anyone**
- Klik **Deploy**
- Copy URL yang muncul (format: `https://script.google.com/macros/s/.../exec`)

### 4. Update Dashboard
- Buka `src/lib/dataset.ts`
- Ganti/tambah `SCRIPT_URL`:
  ```typescript
  export const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
  ```

## Penggunaan

Web App menerima parameter `type`:
- `?type=omset` — data omset utama (default)
- `?type=jasa` — data jasa
- `?type=brand` — data brand

Contoh:
```
https://script.google.com/macros/s/.../exec?type=omset
https://script.google.com/macros/s/.../exec?type=jasa
https://script.google.com/macros/s/.../exec?type=brand
```

## Catatan
- Setiap kali edit kode Apps Script, perlu **deploy ulang** (New deployment)
- Execution time limit: 30 detik (cukup untuk spreadsheet normal)
- Quota: 20.000 request/hari (cukup untuk dashboard personal)
