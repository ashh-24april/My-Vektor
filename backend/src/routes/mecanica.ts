import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getMecanicaKPIs,
  getOrdenes,
  getOrdenById,
  createOrden,
  addRepuestosAOrden,
  updateEstadoOrden,
  getMecanicaAuxiliares
} from "../controllers/mecanica";

const router = Router();

// Todas las rutas de mecánica requieren autenticación
router.use(authenticateToken);

// Métricas y datos auxiliares
router.get("/kpis", getMecanicaKPIs);
router.get("/auxiliares", getMecanicaAuxiliares);

// CRUD y Flujos de Órdenes de Trabajo (OT)
router.get("/", getOrdenes);
router.get("/:id", getOrdenById);
router.post("/", createOrden);
router.post("/:id/repuestos", addRepuestosAOrden);
router.patch("/:id/estado", updateEstadoOrden);

export default router;
