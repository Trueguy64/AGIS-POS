import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { errorHandler } from "./middlewares/errorHandler";
import authRouter from "./routes/auth";
import promoRouter from "./routes/promo";
import itemRouter from "./routes/item";
import categoryRouter from "./routes/category";
import goldRouter from "./routes/gold";
import saleRouter from "./routes/sale";
import shopRouter from "./routes/shop";
import reservationRouter from "./routes/reservation";
import agentRouter from "./routes/agent";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // Render's proxy: req.ip is the client, not the proxy

  // The browser only ever talks to the Vite dev server, which proxies /api and /uploads here (same origin, no CORS).
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api/auth", authRouter);
  app.use("/api/promo", promoRouter);
  app.use("/api/item", itemRouter);
  app.use("/api/category", categoryRouter);
  app.use("/api/gold", goldRouter);
  app.use("/api/sale", saleRouter);
  app.use("/api/shop", shopRouter);
  app.use("/api/reservation", reservationRouter);
  app.use("/api/agent", agentRouter);
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  if (process.env.NODE_ENV === "production") {
    const dist = path.join(process.cwd(), "..", "dist");
    app.use(express.static(dist));
    app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }

  app.use(errorHandler); // last: catches anything passed to next(err), e.g. multer rejections

  return app;
}
