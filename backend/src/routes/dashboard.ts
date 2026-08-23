import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import { getDashboardOverview } from "../controllers/dashboard";

const router = Router();

// El endpoint del Dashboard requiere usuario autenticado
router.use(authenticateToken);

router.get("/overview", getDashboardOverview);

export default router;
