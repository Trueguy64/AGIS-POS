import { bangkokDate, newPdf, thb, when, write } from "./pdfText";

export { bangkokDate };

type Report = {
  from: Date; to: Date;
  sales: { id: number; createdAt: Date; cashierName: string; payment: string; pieces: number; total: number }[];
  summary: { count: number; pieces: number; subtotal: number; discount: number; depositPaid: number; total: number; cash: number; promptPay: number };
};

/** A one-page-per-~35-sales PDF: header, summary, then one row per sale. */
export function salesPdf(report: Report, generatedBy: string): Promise<Buffer> {
  const { doc, done } = newPdf();

  const left = 40, right = doc.page.width - 40, bottom = doc.page.maxY() - 30; // a row past maxY makes pdfkit start a page per cell
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
