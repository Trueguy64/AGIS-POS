import { Router } from "express";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

// GET /api/shop — shop-level settings. PROMPTPAY_ID in server/.env is the account customers pay into;
// when unset the client falls back to the cashier's own phone number and says so.
router.get("/", authenticate, (_req, res) => {
  res.json({ promptPayId: process.env.PROMPTPAY_ID?.trim() || null });
});

export default router;
