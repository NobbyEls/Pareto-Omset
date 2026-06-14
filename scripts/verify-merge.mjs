// Verifies that JASA SERVICE rows are now merged into JASA bucket.
import Papa from "papaparse";
const URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXIuWnOk4-NoraIjEfqp0vDZCnKhqiklrskW_rfJxQatuPtohbwKtcz5TDTwuq7DW3HmzXAa_q2RqI/pub?gid=1186924516&single=true&output=csv";

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MI = MONTHS.reduce((a,m,i)=>((a[m.toLowerCase()]=i),a),{});
const ALIAS = { NB: "NB", PC: "PC", JASA: "JASA", "JASA SERVICE": "JASA" };

function n(s){if(!s)return null;const t=String(s).trim();if(!t||/loading/i.test(t))return null;const x=t.replace(/[^0-9.,-]/g,"").replace(/\./g,"").replace(/,/g,".");const y=Number(x);return Number.isFinite(y)?y:null;}

const text = await fetch(URL,{cache:"no-store"}).then(r=>r.text());
const rows = Papa.parse(text,{skipEmptyLines:false}).data;
const blocks=[];
(rows[0]||[]).forEach((c,i)=>{const m=String(c||"").trim().match(/^(20\d{2})$/);if(m)blocks.push({y:+m[1],mc:i,dc:i+1,vc:i+2});});

const pivot = {};
for (let r=1;r<rows.length;r++){const row=rows[r];if(!row)continue;
  for(const b of blocks){
    const mi = MI[String(row[b.mc]||"").trim().toLowerCase()];
    const cat = ALIAS[String(row[b.dc]||"").trim().toUpperCase()];
    const v = n(row[b.vc]);
    if(mi==null||!cat||v==null)continue;
    pivot[b.y] ??= {}; pivot[b.y][mi] ??= {};
    pivot[b.y][mi][cat] = (pivot[b.y][mi][cat]||0) + v;
  }
}

console.log("2024 Januari:");
console.log("  NB   =", pivot[2024][0].NB?.toLocaleString("id-ID"));
console.log("  PC   =", pivot[2024][0].PC?.toLocaleString("id-ID"));
console.log("  JASA =", pivot[2024][0].JASA?.toLocaleString("id-ID"), "(expect 34.277.626 + 180.156.500 = 214.434.126)");

let yearTotal = 0;
for (let m=0;m<12;m++){
  const c = pivot[2024][m]||{};
  yearTotal += (c.NB||0)+(c.PC||0)+(c.JASA||0);
}
console.log("\n2024 derived total =", yearTotal.toLocaleString("id-ID"));
