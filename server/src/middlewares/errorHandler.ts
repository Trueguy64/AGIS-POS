import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";

interface AppError extends Error {
  status?: number;
}

/** Controller catch-all: a unique-constraint hit is a 409 (the DB is the duplicate check), anything else a 500. */
export function fail(res: Response, err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const field = /fields: \(`(\w+)`\)/.exec(err.message)?.[1]; // the sqlite adapter sets no meta.target
    res.status(409).json({ message: field ? `That ${field} is already in use` : "Already exists" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

// Must have 4 parameters for Express to treat it as an error handler
export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status ?? 500;
  const message = err.message ?? "Internal server error";
  console.error(`[${status}] ${message}`);
  res.status(status).json({ message });
}
