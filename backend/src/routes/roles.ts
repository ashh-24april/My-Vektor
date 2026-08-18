import { Router } from "express";
import { getRoles } from "../controllers/roles";
import { authenticateToken, authorizeRoles } from "../middlewares/auth";

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles("superadmin", "gerente"));

router.get("/", getRoles);

export default router;
