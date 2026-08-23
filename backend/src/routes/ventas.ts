import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getVentasKPIs,
  getVentas,
  getVentaById,
  createVenta,
  updateEstadoPago,
  anularVenta,
  getVentasAuxiliares
} from "../controllers/ventas";

const router = Router();

// Todas las rutas de ventas requieren autenticación
router.use(authenticateToken);

// Métricas y datos auxiliares
router.get("/kpis", getVentasKPIs);
router.get("/auxiliares", getVentasAuxiliares);

// CRUD de Ventas / Facturas
router.get("/", getVentas);
router.get("/:id", getVentaById);
router.post("/", createVenta);
router.patch("/:id/estado", updateEstadoPago);
router.delete("/:id", anularVenta);

export default router;
