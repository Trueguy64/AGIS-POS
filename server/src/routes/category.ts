import { Router } from "express";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const router = Router();

router.get("/all", authenticate, getAllCategories);
router.post("/new", authenticate, authorize("Manager"), createCategory);
router.patch("/update/:id", authenticate, authorize("Manager"), updateCategory);
router.delete("/delete/:id", authenticate, authorize("Manager"), deleteCategory);

export default router;
