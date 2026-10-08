import { Router } from "express";
import { deletePromo, getAllPromo, getPromo, registerPromo, updatePromo } from "../controllers/promoController";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";

const router = Router();

router.get("/allpromo", authenticate, authorize("Manager"), getAllPromo);
router.post("/getpromo", authenticate, getPromo);
router.post("/newpromo", authenticate, authorize("Manager"), registerPromo);
router.patch("/update/:id", authenticate, authorize("Manager"), updatePromo);
router.delete("/delete/:id", authenticate, authorize("Manager"), deletePromo);
export default router;