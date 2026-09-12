
import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getViajes,
  getViajeById,
  getSiguienteFolioViaje,
  createViaje,
  updateViaje,
  updateViajeEstado,
  registrarGastoViaje,
  eliminarGastoViaje,
  deleteViaje,
  getViajesKPIs,
} from "../controllers/viajes";

const router = Router();

// Todas las rutas de viajes requieren autenticación JWT
router.use(authenticateToken);

// KPIs y Correlativo
router.get("/kpis", getViajesKPIs);
router.get("/siguiente-folio", getSiguienteFolioViaje);

// CRUD de Viajes
router.get("/", getViajes);
router.get("/:id", getViajeById);
router.post("/", createViaje);
router.put("/:id", updateViaje);
router.patch("/:id/estado", updateViajeEstado);
router.delete("/:id", deleteViaje);

// Gastos y Liquidación de Viaje
router.post("/:id/gastos", registrarGastoViaje);
router.delete("/:id/gastos/:idGasto", eliminarGastoViaje);

export default router;
