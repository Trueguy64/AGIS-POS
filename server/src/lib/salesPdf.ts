import PDFDocument from "pdfkit";
import { join } from "node:path";

type Report = {
  from: Date; to: Date;
  sales: { id: number; createdAt: Date; cashierName: string; payment: string; pieces: number; total: number }[];
  summary: { count: number; pieces: number; subtotal: number; discount: number; depositPaid: number; total: number; cash: number; promptPay: number };
};

const FONTS = join(import.meta.dirname, "../../assets/fonts");
const THAI = /([฀-๿]+)/;
const TZ = "Asia/Bangkok";
// No ฿: it sits in the Thai block, and a second run breaks right alignment. The header says THB instead.
const thb = (n: number) => Math.round(n).toLocaleString("en-US");
const when = (d: Date) => d.toLocaleString("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const bangkokDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

/** The font files are per-script subsets, so each string is split into Thai and Latin runs.
 *  ponytail: no shaping across runs; fine for names and titles, not for long mixed prose. */
function write(doc: PDFKit.PDFDocument, s: string, x: number, y: number, o: { bold?: boolean; size?: number; width?: number; align?: "left" | "right" } = {}) {
  doc.fontSize(o.size ?? 10);
  const runs = s.split(THAI).filter(Boolean);
  const opts = { width: o.width, align: o.align, lineBreak: false };
  runs.forEach((r, i) => {
    doc.font(`${THAI.test(r) ? "th" : "la"}${o.bold ? "-b" : ""}`);
    const more = { ...opts, continued: i < runs.length - 1 };
    if (i === 0) doc.text(r, x, y, more); else doc.text(r, more);
  });
}

/** A one-page-per-~35-sales PDF: header, summary, then one row per sale. */
export function salesPdf(report: Report, generatedBy: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  for (const [name, file] of [["th", "thai-400"], ["la", "latin-400"], ["th-b", "thai-600"], ["la-b", "latin-600"]]) {
    doc.registerFont(name, join(FONTS, `noto-sans-thai-${file}-normal.woff`));
  }
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const left = 40, right = doc.page.width - 40, bottom = doc.page.height - 50;
  write(doc, "รายงานยอดขาย Sales report", left, 40, { bold: true, size: 18 });
  write(doc, `${when(report.from)} – ${when(new Date(report.to.getTime() - 1))}`, left, 66, { size: 11 });
  write(doc, `Generated ${when(new Date())} by ${generatedBy} · amounts in THB`, left, 82, { size: 9 });

  const s = report.summary;
  const facts: [string, string][] = [
    ["Sales", String(s.count)], ["Pieces", String(s.pieces)], ["Subtotal", thb(s.subtotal)], ["Discounts", `-${thb(s.discount)}`],
    ["Deposits (PayPal)", `-${thb(s.depositPaid)}`], ["Taken at the counter", thb(s.total)], ["Cash", thb(s.cash)], ["PromptPay", thb(s.promptPay)],
  ];
  let y = 112;
  facts.forEach(([k, v], i) => {
    const x = i % 2 ? left + 270 : left;
    write(doc, k, x, y);
    write(doc, v, x + 120, y, { bold: true, width: 120, align: "right" });
    if (i % 2) y += 18;
  });

  const cols = [
    { label: "Receipt", x: left, w: 60 }, { label: "Time", x: left + 60, w: 120 }, { label: "Cashier", x: left + 180, w: 130 },
    { label: "Payment", x: left + 310, w: 70 }, { label: "Pieces", x: left + 380, w: 45, right: true }, { label: "Total", x: left + 425, w: right - left - 425, right: true },
  ];
  const header = () => {
    cols.forEach((c) => write(doc, c.label, c.x, y, { bold: true, width: c.w, align: c.right ? "right" : "left" }));
    y += 16;
    doc.moveTo(left, y - 3).lineTo(right, y - 3).lineWidth(0.5).stroke();
  };
  y += 16;
  header();
  if (report.sales.length === 0) write(doc, "No sales in this range.", left, y);
  for (const sale of report.sales) {
    if (y > bottom) { doc.addPage(); y = 40; header(); }
    const cells = [`#${String(sale.id).padStart(6, "0")}`, when(sale.createdAt), sale.cashierName.slice(0, 22), sale.payment, String(sale.pieces), thb(sale.total)];
    cells.forEach((v, i) => write(doc, v, cols[i].x, y, { width: cols[i].w, align: cols[i].right ? "right" : "left" }));
    y += 15;
  }
  doc.end();
  return done;
}
