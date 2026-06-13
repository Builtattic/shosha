/** Smoke test: jspdf can write a valid PDF (ShareCardModal dependency). */
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '..', 'verify-output', 'smoke-test.pdf');
const w = 600 * 0.2646;
const h = 600 * 0.2646;
const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [w, h] });
pdf.setFillColor(24, 24, 27);
pdf.rect(0, 0, w, h, 'F');
pdf.setTextColor(255, 255, 255);
pdf.setFontSize(14);
pdf.text('Shosha share card PDF smoke test', 10, 20);
pdf.save(out);
const stat = fs.statSync(out);
console.log(JSON.stringify({ path: out, bytes: stat.size, pass: stat.size > 500 }, null, 2));
