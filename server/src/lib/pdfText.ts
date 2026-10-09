import PDFDocument from "pdfkit";
import { join } from "node:path";

const FONTS = join(import.meta.dirname, "../../assets/fonts");
const THAI = /([฀-๿]+)/;
const TZ = "Asia/Bangkok";
// No ฿: it sits in the Thai block, and a second run breaks right alignment. The header says THB instead.
export const thb = (n: number) => Math.round(n).toLocaleString("en-US");
export const when = (d: Date) => d.toLocaleString("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const bangkokDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

/** The font files are per-script subsets, so each string is split into Thai and Latin runs.
 *  ponytail: no shaping across runs; fine for names and titles, not for long mixed prose. */
export function write(doc: PDFKit.PDFDocument, s: string, x: number, y: number, o: { bold?: boolean; size?: number; width?: number; align?: "left" | "right" } = {}) {
  doc.fontSize(o.size ?? 10);
  // Measure every run in its own font, then place them side by side: aligning each run separately overlaps them.
  const runs = s.split(THAI).filter(Boolean).map((text) => {
    const font = `${THAI.test(text) ? "th" : "la"}${o.bold ? "-b" : ""}`;
    return { text, font, w: doc.font(font).widthOfString(text) };
  });
  const total = runs.reduce((n, r) => n + r.w, 0);
  const start = o.align === "right" && o.width !== undefined ? x + o.width - total : x;
  let cx = start;
  for (const r of runs) { doc.font(r.font).text(r.text, cx, y, { lineBreak: false }); cx += r.w; }
  return { start, end: cx };
}

/** An A4 document with the Thai and Latin font subsets registered, and its bytes as a promise. */
export function newPdf() {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  for (const [name, file] of [["th", "thai-400"], ["la", "latin-400"], ["th-b", "thai-600"], ["la-b", "latin-600"]]) {
    doc.registerFont(name, join(FONTS, `noto-sans-thai-${file}-normal.woff`));
  }
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  return { doc, done };
}
