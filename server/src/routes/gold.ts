import { Router } from "express";
import { getGoldRate } from "../lib/goldRate";

const router = Router();

// Public: the rate is public market data and the login page needs nothing else.
router.get("/", async (_req, res) => {
  try {
    res.json(await getGoldRate());
  } catch (err) {
    console.error("Gold rate fetch failed:", err);
    res.status(502).json({ message: "Gold rate unavailable" });
  }
});

export default router;
