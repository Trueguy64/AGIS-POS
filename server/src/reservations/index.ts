import { prisma } from "../db";
import { createPayPal } from "../paypal/client";
import { getGoldRateFresh } from "../lib/goldRate";
import { createReservations, configFromEnv } from "./service";

let instance: ReturnType<typeof createReservations> | null = null;
/** Lazy so tests can set env before first use. */
export function getReservations() {
  instance ??= createReservations({
    prisma,
    paypal: createPayPal({ clientId: process.env.PAYPAL_CLIENT_ID ?? "", secret: process.env.PAYPAL_SECRET ?? "", base: process.env.PAYPAL_BASE }),
    now: () => new Date(),
    getRate: getGoldRateFresh,
    config: configFromEnv(),
  });
  return instance;
}
export { ReservationError } from "./service";
