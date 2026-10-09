/**
 * Cashier-flow strings, Thai first, English second.
 * Thai copy here was written by the build and should be reviewed by a native speaker before the shop relies on it.
 */
export const S = {
  // shell
  searchPieces: ["ค้นหาสินค้า", "Search pieces"],
  filterByCategory: ["เลือกหมวดหมู่", "Filter by category"],
  allPieces: ["ทั้งหมด", "All pieces"],
  uncategorized: ["ไม่มีหมวดหมู่", "Uncategorized"],
  settings: ["บัญชีของฉัน", "My account"],
  storeEditor: ["จัดการร้าน", "Store editor"],
  checkout: ["ชำระเงิน", "Checkout"],
  toggleCategories: ["เปิด/ปิดหมวดหมู่", "Toggle categories"],
  closeCategories: ["ปิดหมวดหมู่", "Close categories"],
  // rate
  rate: ["ราคาทอง", "Rate"],
  ornament: ["ทองรูปพรรณ", "Ornament 96.5%"],
  bar: ["ทองคำแท่ง", "Bar 96.5%"],
  perBaht: ["/บาท", "per baht"],
  perGram: ["/กรัม ทองคำบริสุทธิ์", "per gram pure gold"],
  rateLoading: ["กำลังโหลดราคาทอง…", "Rate loading…"],
  rateUnavailable: ["ดึงราคาทองไม่ได้", "Rate unavailable"],
  retry: ["ลองใหม่", "Retry"],
  stale: ["ราคาเก่า", "Stale"],
  rateLocked: ["ล็อกราคาแล้ว", "Rate locked"],
  rateStaleLock: ["ราคานี้เก่าแล้ว · ลองใหม่ก่อนล็อก", "This rate is stale · Retry before locking"], // Thai added 2026-10-08, awaits native-speaker review with the rest of the table
  rateDetails: ["ที่มาของราคา", "How the rate is made"],
  updated: ["อัปเดต", "Updated"],
  // catalog & bag
  soldOut: ["หมด", "Sold out"],
  laborFee: ["ค่ากำเหน็จ", "Labor fee"],
  gold: ["ทอง", "Gold"],
  stock: ["คงเหลือ", "In stock"],
  quantity: ["จำนวน", "Quantity"],
  addToBag: ["เพิ่มลงรายการ", "Add to bag"],
  close: ["ปิด", "Close"],
  bag: ["รายการขาย", "Sale items"],
  bagEmpty: ["ยังไม่มีรายการ", "No items yet"],
  bagEmptyHint: ["กลับไปหน้าสินค้า แล้วแตะชิ้นที่ต้องการขาย", "Go back to the catalog and tap a piece to add it."],
  backToCatalog: ["กลับไปหน้าสินค้า", "Back to catalog"],
  pieces: ["ชิ้น", "pieces"],
  each: ["ต่อชิ้น", "each"],
  oneFewer: ["ลดจำนวน", "One fewer"],
  oneMore: ["เพิ่มจำนวน", "One more"],
  remove: ["ลบ", "Remove"],
  noMatch: ["ไม่พบสินค้า", "No pieces match"],
  noMatchHint: ["ล้างคำค้นหาหรือเลือกหมวดหมู่อื่น", "Clear the search or pick another category."],
  // receipt
  receipt: ["ใบเสร็จ", "Receipt"],
  subtotal: ["ยอดรวม", "Subtotal"],
  discount: ["ส่วนลด", "Discount"],
  total: ["ยอดสุทธิ", "Total"],
  promoCode: ["รหัสส่วนลด", "Promo code"],
  apply: ["ใช้รหัส", "Apply"],
  lockAndContinue: ["ล็อกราคาแล้วชำระเงิน", "Lock rate and continue"],
  waitingForRate: ["รอราคาทอง…", "Waiting for rate…"],
  lockedForSale: ["ล็อกราคาสำหรับรายการนี้แล้ว", "Rate locked for this sale"],
  // payment
  howPaying: ["ลูกค้าชำระด้วยวิธีใด", "How is the customer paying?"],
  totalDue: ["ยอดที่ต้องชำระ", "Total due"],
  cash: ["เงินสด", "Cash"],
  promptpay: ["พร้อมเพย์", "PromptPay"],
  cancelToBag: ["ยกเลิก กลับไปรายการขาย", "Cancel and go back to the items"],
  cashGiven: ["รับเงินสด", "Cash given"],
  cashGivenHint: ["จำนวนเงินที่ลูกค้ายื่นให้", "Amount the customer handed over"],
  exact: ["พอดี", "Exact"],
  change: ["เงินทอน", "Change"],
  short: ["ขาดอีก", "Short"],
  confirmPayment: ["ยืนยันการชำระเงิน", "Confirm payment"],
  confirmingPayment: ["กำลังบันทึก…", "Recording sale…"],
  transferChecked: ["ตรวจสอบยอดโอนในแอปธนาคารแล้ว", "Transfer received and checked in the bank app"],
  noPhone: ["ร้านยังไม่ได้ตั้งค่าบัญชีพร้อมเพย์ และบัญชีพนักงานไม่มีเบอร์โทร", "No PromptPay account is set for the shop and this staff account has no phone number."],
  lockOld: ["ล็อกราคาไว้นานแล้ว", "The rate was locked a while ago"],
  keepLocked: ["ใช้ราคาที่ล็อก", "Keep locked rate"],
  relock: ["ล็อกราคาใหม่", "Relock at live rate"],
  saleFailed: ["บันทึกการขายไม่สำเร็จ", "The sale could not be recorded"],
  // thank you & print
  paid: ["ชำระเงินเรียบร้อย ขอบคุณ", "Paid. Thank you."],
  paidAmount: ["รับชำระ", "Paid"],
  printReceipt: ["พิมพ์ใบเสร็จ", "Print receipt"],
  newSale: ["ขายรายการใหม่", "New sale"],
  receiptNo: ["เลขที่ใบเสร็จ", "Receipt no."],
  cashier: ["พนักงานขาย", "Cashier"],
  paymentMethod: ["ชำระโดย", "Payment"],
  printedAt: ["พิมพ์เมื่อ", "Printed"],
  item: ["รายการ", "Item"],
  unitPrice: ["ราคาต่อชิ้น", "Unit"],
  qty: ["จำนวน", "Qty"],
  amount: ["จำนวนเงิน", "Amount"],
  formula: [
    "ราคา = น้ำหนัก × ความบริสุทธิ์ × ราคาทองต่อกรัมที่ล็อกไว้ + ค่ากำเหน็จต่อชิ้น (ปัดเป็นบาทถ้วน)",
    "Price = weight × purity × the locked rate per gram of pure gold + labor fee per piece, rounded to whole baht.",
  ],
  saleNotFound: ["ไม่พบรายการขายนี้", "This sale could not be found"],
  loadingSale: ["กำลังโหลดใบเสร็จ…", "Loading receipt…"],
  // reservations (Task 10)
  reservations: ["การจอง", "Reservations"],
  noReservations: ["ยังไม่มีการจอง", "No reservations yet"], // Thai pending native-speaker review // Thai pending native-speaker review
  reserved: ["จองแล้ว", "Reserved"], // Thai pending native-speaker review
  checkPayment: ["ตรวจการชำระ", "Check payment"], // Thai pending native-speaker review
  collect: ["รับของ", "Collect"], // Thai pending native-speaker review
  acceptPaid: ["ยืนยันว่าชำระแล้ว", "Accept as paid"], // Thai pending native-speaker review
  cancelRefunded: ["ยกเลิก (คืนเงินใน PayPal แล้ว)", "Cancel (refunded in PayPal)"], // Thai pending native-speaker review
  sales: ["ยอดขาย", "Sales"], // Thai for the sales-report keys pending native-speaker review
  dateFrom: ["ตั้งแต่", "From"],
  dateTo: ["ถึง", "To"],
  salesCount: ["จำนวนบิล", "Sales"],
  takenAtCounter: ["รับที่หน้าร้าน", "Taken at the counter"],
  noSales: ["ไม่มียอดขายในช่วงนี้", "No sales in this range"],
  downloadPdf: ["ดาวน์โหลด PDF", "Download PDF"],
  time: ["เวลา", "Time"],
  depositPaid: ["มัดจำ PayPal", "PayPal deposit"], // Thai pending native-speaker review
  balance: ["ยอดคงเหลือ", "Balance"], // Thai pending native-speaker review
  held: ["ถูกจอง", "held"], // Thai pending native-speaker review
} as const satisfies Record<string, readonly [string, string]>;

export type StrKey = keyof typeof S;

export const th = (k: StrKey) => S[k][0];
export const en = (k: StrKey) => S[k][1];
/** Both languages in one string, for aria-labels, titles and placeholders. */
export const both = (k: StrKey) => `${S[k][0]} · ${S[k][1]}`;
