import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/token";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.cookie?.match(/(?:^|;\s*)token=([^;]+)/)?.[1];
  const payload = token && verifyToken(token, process.env.JWT_SECRET!);
  if (!payload) { res.status(401).json({ message: "Not authenticated" }); return; }
  req.user = payload;
  next();
}
