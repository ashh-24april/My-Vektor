import { Router } from "express";
import { getUsers, getUserById, createUser, updateUser, changePassword, updateAdminProtectionKey } from "../controllers/users";
import { authenticateToken, authorizeRoles } from "../middlewares/auth";

const router = Router();

// Todos los endpoints de usuarios requieren estar autenticados y ser Superadministrador o Gerente
router.use(authenticateToken);
router.use(authorizeRoles("superadmin", "gerente"));

router.put("/config/admin-key", updateAdminProtectionKey);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.put("/:id/password", changePassword);

export default router;
