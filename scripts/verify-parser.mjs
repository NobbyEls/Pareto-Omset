// Quick smoke-test: runs the CSV parser against the live published sheet
// and prints what it found.
import Papa from "papaparse";

const URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1186924516&single=true&output=csv";

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTH_INDEX = MONTHS_ID.reduce((a, m, i) => ((a[m.toLowerCase()] = i), a), {});

const ALL = ["NB", "PC", "JASA SERVICE", "JASA", "Grand Total"];
const KNOWN = new Set(ALL.map((c) => c.toUpperCase()));

function parseIDNumber(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || /loading/i.test(s)) return null;
  const cleaned = s.replace(/[^0-9.,-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned.replace(/\./g, "").replace(/,/g, "."));
  return Number.isFinite(n) ? n : null;
}

function detectYearBlocks(header) {
  const blocks = [];
  for (let i = 0; i < header.length; i++) {
    const m = String(header[i] || "").trim().match(/^(20\d{2})$/);
    if (m) blocks.push({ year: +m[1], monthCol: i, deptCol: i + 1, valueCol: i + 2 });
  }
  return blocks;
}

const text = await fetch(URL, { cache: "no-store" }).then((r) => r.text());
const rows = Papa.parse(text, { skipEmptyLines: false }).data;
const blocks = detectYearBlocks(rows[0] || []);
console.log("Detected year blocks:", blocks);

let count = 0;
const summary = {};
for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (!row) continue;
  for (const b of blocks) {
    const month = MONTH_INDEX[String(row[b.monthCol] || "").trim().toLowerCase()];
    const cat = String(row[b.deptCol] || "").trim().toUpperCase();
    const val = parseIDNumber(row[b.valueCol]);
    if (month == null || !KNOWN.has(cat) || val == null) continue;
    summary[b.year] = summary[b.year] || { records: 0, total: 0 };
    summary[b.year].records++;
    if (cat === "GRAND TOTAL") summary[b.year].total += val;
    count++;
  }
}
console.log(`\nParsed ${count} records.`);
for (const y of Object.keys(summary).sort()) {
  console.log(
    `  ${y}: ${summary[y].records} rows | sum(Grand Total) = ${summary[y].total.toLocaleString("id-ID")}`
  );
}
