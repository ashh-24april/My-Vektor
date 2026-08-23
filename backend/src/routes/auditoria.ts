import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getAuditLogs,
  getAuditKPIs,
  createAuditLog
} from "../controllers/auditoria";

const router = Router();

// Todas las rutas de auditoría requieren usuario autenticado
router.use(authenticateToken);

router.get("/kpis", getAuditKPIs);
router.get("/", getAuditLogs);
router.post("/", createAuditLog);

export default router;
