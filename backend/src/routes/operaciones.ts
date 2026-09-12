
import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getVehiculos,
  getVehiculoById,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo,
  getPilotos,
  getPilotoById,
  createPiloto,
  updatePiloto,
  deletePiloto,
  asignarPilotoVehiculo,
  getOperacionesKPIs,
} from "../controllers/operaciones";

const router = Router();

// Todas las rutas de operaciones requieren autenticación JWT
router.use(authenticateToken);

// KPIs y Dispatch Board
router.get("/kpis", getOperacionesKPIs);

// Flota / Vehículos
router.get("/vehiculos", getVehiculos);
router.get("/vehiculos/:id", getVehiculoById);
router.post("/vehiculos", createVehiculo);
router.put("/vehiculos/:id", updateVehiculo);
router.delete("/vehiculos/:id", deleteVehiculo);

// Pilotos / Operadores
router.get("/pilotos", getPilotos);
router.get("/pilotos/:id", getPilotoById);
router.post("/pilotos", createPiloto);
router.put("/pilotos/:id", updatePiloto);
router.delete("/pilotos/:id", deletePiloto);

// Asignación Operativa
router.post("/asignar", asignarPilotoVehiculo);

export default router;
