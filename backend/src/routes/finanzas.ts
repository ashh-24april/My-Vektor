
import { Router } from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/auth";
import {
  getKPIsFinanzas,
  getSiguienteFolioTransaccion,
  getTransacciones,
  getTransaccionById,
  createTransaccion,
  updateTransaccion,
  registrarPagoCobro,
  anularTransaccion,
  getRentabilidadPorVehiculo,
  getCuentasPorCobrar,
} from "../controllers/finanzas";

const router = Router();

// Middleware de autenticación global para todas las rutas financieras
router.use(authenticateToken);

const FINANZAS_ROLES = [
  "contador",
  "Contador",
  "superadmin",
  "Superadministrador",
  "gerente",
  "Gerente",
  "administrador",
  "Administrador",
];

// Rutas de KPIs y Estadísticas Financieras
router.get("/kpis", authorizeRoles(...FINANZAS_ROLES), getKPIsFinanzas);
router.get("/siguiente-folio", authorizeRoles(...FINANZAS_ROLES), getSiguienteFolioTransaccion);
router.get("/rentabilidad-vehiculos", authorizeRoles(...FINANZAS_ROLES), getRentabilidadPorVehiculo);
router.get("/cuentas-cobrar", authorizeRoles(...FINANZAS_ROLES), getCuentasPorCobrar);

// CRUD de Transacciones
router.get("/", authorizeRoles(...FINANZAS_ROLES), getTransacciones);
router.get("/:id", authorizeRoles(...FINANZAS_ROLES), getTransaccionById);
router.post("/", authorizeRoles(...FINANZAS_ROLES), createTransaccion);
router.put("/:id", authorizeRoles(...FINANZAS_ROLES), updateTransaccion);
router.patch("/:id/pago", authorizeRoles(...FINANZAS_ROLES), registrarPagoCobro);
router.delete("/:id", authorizeRoles(...FINANZAS_ROLES), anularTransaccion);

export default router;
