import { Router, type Response } from "express";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { getReservations, ReservationError } from "../reservations";
import { configFromEnv } from "../reservations/service";

export function sendReservationError(res: Response, err: unknown) {
  if (!(err instanceof ReservationError)) throw err;
  const status = err.code === "NOT_FOUND" ? 404 : err.code === "INVALID_CUSTOMER" ? 400 : ["RATE_UNAVAILABLE", "PAYPAL_UNAVAILABLE"].includes(err.code) ? 503 : 409;
  res.status(status).json({ message: err.message, code: err.code });
}

const router = Router();

router.get("/config", (_req, res) => {
  res.json({ paypalClientId: process.env.PAYPAL_CLIENT_ID ?? "", currency: configFromEnv().currency });
});

// Public: the PayPal button and /reserve polling call this. The body is never read (§4.3).
router.post("/:id/capture", async (req, res) => {
  try { const r = await getReservations().captureReservation(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});

router.get("/", authenticate, async (_req, res) => {
  const rows = await getReservations().list();
  res.json(rows.map((r) => ({
    id: r.id, status: r.status, customerName: r.customerName, contact: r.contact, itemId: r.itemId, itemTitle: r.item.title,
    priceTHB: r.quote.priceSatang / 100, depositTHB: r.quote.depositSatang / 100, heldUntil: r.heldUntil, createdAt: r.createdAt, captureStatus: r.captureStatus,
  })));
});

router.post("/:id/check", authenticate, async (req, res) => {
  try { const r = await getReservations().captureReservation(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});
router.post("/:id/accept", authenticate, authorize("Manager"), async (req, res) => {
  try { const r = await getReservations().acceptReview(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});
router.post("/:id/cancel", authenticate, authorize("Manager"), async (req, res) => {
  try { const r = await getReservations().cancelReview(String(req.params.id)); res.json({ id: r.id, status: r.status }); }
  catch (e) { sendReservationError(res, e); }
});

export default router;
