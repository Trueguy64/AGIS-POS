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

// The browser only ever talks to the Vite dev server, which proxies /api and /uploads here (same origin, no CORS).
const app = express();
const PORT = process.env.PORT ?? 3000;

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
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use(errorHandler); // last: catches anything passed to next(err), e.g. multer rejections

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
