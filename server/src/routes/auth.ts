import { Router } from "express";
import { register, login, logout, getMe, updateUser } from "../controllers/authController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout); // ← authenticate added
router.get("/me", authenticate, getMe);
router.patch("/update/:id", authenticate, updateUser);
export default router;