import { Router } from "express";
import { deleteItem, getItem, registerItem, adjustStock, updateItem, getInventory } from "../controllers/ItemController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { upload } from "../middlewares/upload";

const router = Router();

router.get("/inventory", authenticate, getInventory);
router.get("/:id", authenticate, getItem);
router.post("/new", authenticate, authorize("Manager"), upload.single("image"), registerItem);
router.patch("/update/:id", authenticate, authorize("Manager"), upload.single("image"), updateItem);
router.delete("/delete/:id", authenticate, authorize("Manager"), deleteItem);
router.patch("/stock/:id", authenticate, authorize("Manager"), adjustStock);

export default router;