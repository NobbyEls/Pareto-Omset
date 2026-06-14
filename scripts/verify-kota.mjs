// Smoke test against the new CSV with kota column.
import Papa from "papaparse";
const URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1311218554&single=true&output=csv&_=" +
  Date.now();

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];
const MI = MONTHS.reduce((a,m,i)=>((a[m.toLowerCase()]=i),a),{});
const ALIAS = { NB: "NB", PC: "PC", JASA: "JASA", "JASA SERVICE": "JASA" };
const KOTA = ["G-YGY","G-SLO","G-PWT","G-BBS","G-TGL","G-MDN","G-SMG"];
const KOTA_NAMES = {
  "G-YGY":"Yogyakarta","G-SLO":"Solo","G-PWT":"Purwokerto",
  "G-BBS":"Babarsari","G-TGL":"Tegal","G-MDN":"Madiun","G-SMG":"Semarang",
};

function n(s){if(!s)return null;const t=String(s).trim();if(!t||/loading/i.test(t))return null;const x=t.replace(/[^0-9.,-]/g,"").replace(/\./g,"").replace(/,/g,".");const y=Number(x);return Number.isFinite(y)?y:null;}

const text = await fetch(URL,{cache:"no-store"}).then(r=>r.text());
const rows = Papa.parse(text,{skipEmptyLines:false}).data;

const header = rows[0]||[]; const sub = rows[1]||[];
const blocks = [];
header.forEach((c,i)=>{
  const m = String(c||"").trim().match(/^(20\d{2})$/);
  if (!m) return;
  const next = String(sub[i+1]||"").trim().toLowerCase();
  const k = (next === "cabang" || next === "kode gudang" || next === "kota");
  blocks.push({y:+m[1], mc:i, kc:k?i+1:-1, dc:k?i+2:i+1, vc:k?i+3:i+2});
});
console.log("Year blocks:");
console.table(blocks);

const pivotKota = {};
for (let r=2;r<rows.length;r++){
  const row = rows[r]; if(!row) continue;
  for (const b of blocks){
    const mi = MI[String(row[b.mc]||"").trim().toLowerCase()];
    const cat = ALIAS[String(row[b.dc]||"").trim().toUpperCase()];
    const v = n(row[b.vc]);
    if (mi==null||!cat||v==null) continue;
    const kota = b.kc>=0 ? String(row[b.kc]||"").trim().toUpperCase() : null;
    if (b.kc>=0 && !KOTA.includes(kota)) continue;
    if (!kota) continue;
    pivotKota[b.y] ??= {}; pivotKota[b.y][mi] ??= {}; pivotKota[b.y][mi][kota] ??= {};
    pivotKota[b.y][mi][kota][cat] = (pivotKota[b.y][mi][kota][cat]||0)+v;
  }
}

console.log("\nPer-kota total Januari 2024:");
for (const k of KOTA){
  const cell = pivotKota[2024]?.[0]?.[k] || {};
  const t = (cell.NB||0)+(cell.PC||0)+(cell.JASA||0);
  if (t>0) console.log(`  ${k} (${KOTA_NAMES[k]}) = ${t.toLocaleString("id-ID")}`);
}
const grandJan2024 = KOTA.reduce((s,k)=>{
  const c = pivotKota[2024]?.[0]?.[k]||{};
  return s + (c.NB||0)+(c.PC||0)+(c.JASA||0);
}, 0);
console.log("  Grand Total Januari 2024 =", grandJan2024.toLocaleString("id-ID"), "(expect 61.888.638.470)");

console.log("\nKota yang ada di data:");
const seen = new Set();
for (const y of Object.keys(pivotKota)){
  for (const mi of Object.keys(pivotKota[y])){
    for (const k of Object.keys(pivotKota[y][mi])) seen.add(k);
  }
}
console.log("  ", [...seen].sort());

console.log("\nTotal per kota untuk 2026:");
for (const k of KOTA){
  let total = 0;
  for (let i=0;i<12;i++){
    const c = pivotKota[2026]?.[i]?.[k]||{};
    total += (c.NB||0)+(c.PC||0)+(c.JASA||0);
  }
  if (total>0) console.log(`  ${k} (${KOTA_NAMES[k]}) = ${total.toLocaleString("id-ID")}`);
}
