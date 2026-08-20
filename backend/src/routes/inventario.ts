import { Router } from "express";
import { authenticateToken } from "../middlewares/auth";
import {
  getCategorias, createCategoria, updateCategoria, deleteCategoria,
  getProveedores, createProveedor, updateProveedor, deleteProveedor,
  getProductos, getProductoById, createProducto, updateProducto, deleteProducto,
  getMovimientos, registrarMovimiento,
  getCompras, getCompraById, createCompra, updateCompraEstado,
} from "../controllers/inventario";

const router = Router();

// Todas las rutas de inventario requieren autenticación
router.use(authenticateToken);

// Categorías
router.get("/categorias",              getCategorias);
router.post("/categorias",             createCategoria);
router.put("/categorias/:id",          updateCategoria);
router.delete("/categorias/:id",       deleteCategoria);

// Proveedores
router.get("/proveedores",             getProveedores);
router.post("/proveedores",            createProveedor);
router.put("/proveedores/:id",         updateProveedor);
router.delete("/proveedores/:id",      deleteProveedor);

// Productos
router.get("/productos",               getProductos);
router.get("/productos/:id",           getProductoById);
router.post("/productos",              createProducto);
router.put("/productos/:id",           updateProducto);
router.delete("/productos/:id",        deleteProducto);

// Movimientos de inventario
router.get("/movimientos/:productoId", getMovimientos);
router.post("/movimientos",            registrarMovimiento);

// Compras
router.get("/compras",                 getCompras);
router.get("/compras/:id",             getCompraById);
router.post("/compras",                createCompra);
router.put("/compras/:id/estado",      updateCompraEstado);

export default router;
