import { fromMinor } from "../paypal/client";
import { newPdf, thb, when, write } from "./pdfText";

type Receipt = {
  ref: string; status: string; customerName: string; contact: string; heldUntil: Date; paypalOrderId: string | null;
  item: { title: string; weight: number; purity: number; laborFee: number };
  quote: { goldRate: number; priceSatang: number; depositSatang: number; currency: string; depositMinor: number; createdAt: Date };
  capturedMinor: number | null;
};

/** The customer's proof of a paid deposit: what they reserved, at what locked price, what they paid and what is left. */
export function depositReceiptPdf(r: Receipt): Promise<Buffer> {
  const { doc, done } = newPdf();
  const left = 40, right = doc.page.width - 40, width = right - left;
  const price = r.quote.priceSatang / 100, deposit = r.quote.depositSatang / 100;
  let y = 40;
  const row = (label: string, value: string, o: { bold?: boolean; size?: number } = {}) => {
    write(doc, label, left, y, { bold: o.bold, size: o.size ?? 11 });
    write(doc, value, left, y, { bold: o.bold, size: o.size ?? 11, width, align: "right" });
    y += (o.size ?? 11) + 9;
  };
  const rule = () => { doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).stroke(); y += 10; };

  write(doc, "ใบรับมัดจำ Deposit receipt", left, y, { bold: true, size: 18 }); y += 28;
  write(doc, "AGIS Gold · amounts in THB", left, y, { size: 10 }); y += 28;

  write(doc, "Reference", left, y, { size: 10 }); y += 14;
  write(doc, r.ref, left, y, { bold: true, size: 24 }); y += 36;
  row("Status", r.status === "COLLECTED" ? "Collected" : "Deposit paid");
  row("Issued", when(new Date()));
  row("Customer", `${r.customerName} · ${r.contact}`);
  y += 8; rule();

  row("Piece", r.item.title, { bold: true });
  row("Weight · purity", `${r.item.weight} g · ${+(r.item.purity * 100).toFixed(2)}%`);
  row("Gold rate (locked)", `${r.quote.goldRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per gram pure gold`);
  row("Rate locked at", when(r.quote.createdAt));
  row("Labour fee", thb(r.item.laborFee));
  y += 8; rule();

  row("Price", thb(price));
  row("Deposit paid with PayPal", `-${thb(deposit)}`);
  if (r.quote.currency !== "THB") row("Deposit charged", `${fromMinor(r.capturedMinor ?? r.quote.depositMinor)} ${r.quote.currency}`);
  rule();
  row("Balance to pay at the counter", thb(price - deposit), { bold: true, size: 14 });
  if (r.paypalOrderId) row("PayPal order", r.paypalOrderId);
  y += 16;

  if (r.status !== "COLLECTED") {
    write(doc, `Show this reference at the counter by ${when(r.heldUntil)} (Bangkok time).`, left, y, { bold: true }); y += 18;
    write(doc, "The deposit holds this piece and this price for 48 hours.", left, y, { size: 10 }); y += 14;
    write(doc, "If it is not collected in time, the deposit is forfeited.", left, y, { size: 10 }); y += 16;
  }
  write(doc, "Price = weight × purity × locked gold rate + labour fee.", left, y, { size: 10 });
  doc.end();
  return done;
}
