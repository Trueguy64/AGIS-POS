import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Step 1 — read the token from the cookie
  const token = req.cookies?.token as string | undefined;

  // Step 2 — if no token, the user is not logged in
  if (!token) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  // Step 3 — verify the token
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Step 4 — attach the decoded payload to the request object
    req.user = payload;

    // Step 5 — pass control to the next middleware or controller
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}