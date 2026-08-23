import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import rolesRoutes from "./routes/roles";
import inventarioRoutes from "./routes/inventario";
import ventasRoutes from "./routes/ventas";

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Habilitar trust proxy para despliegues detrás de reverse proxies (Render / Cloudflare)
app.set("trust proxy", 1);

// Configuración de Helmet para añadir cabeceras de seguridad HTTP
app.use(helmet());

// Configuración dinámica de CORS (Local + Vercel en producción)
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como Postman o curl) o de dominios autorizados/Vercel
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Acceso denegado por políticas de CORS."));
      }
    },
    credentials: true // Permite el envío de cookies HttpOnly entre Vercel y Render
  })
);

// Parsers para el body y cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/ventas", ventasRoutes);

// Ruta de estado general para validaciones
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Manejo global de errores
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Internal Server Error:", err.message);
  res.status(500).json({ error: "Ocurrió un error interno en el servidor." });
});

// Levantar el servidor
app.listen(PORT, () => {
  console.log(`[MyVektor Backend] Servidor corriendo en el puerto ${PORT}`);
});
