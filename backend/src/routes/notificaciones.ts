import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  registrarAuditoriaExportacion
} from "../controllers/notificaciones";

const router = Router();

// Todas las rutas requieren usuario autenticado
router.use(authenticateToken);

router.get("/", getNotificaciones);
router.patch("/:id/leida", marcarNotificacionLeida);
router.post("/marcar-todas", marcarTodasLeidas);
router.post("/auditoria-exportacion", registrarAuditoriaExportacion);

export default router;
