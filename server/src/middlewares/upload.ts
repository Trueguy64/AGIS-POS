import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
});

export const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) cb(null, true);
        else cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});
