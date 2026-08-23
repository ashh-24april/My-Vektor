import { Response } from "express";
import prisma from "../config/prisma";
import { AuthenticatedRequest } from "../middlewares/auth";

/**
 * GET /api/dashboard/overview
 * Retorna el conjunto completo de métricas consolidadas, analítica de gráficos y actividad reciente.
 */
export const getDashboardOverview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { periodo = "mes_actual" } = req.query;

    const ahora = new Date();
    let fechaInicio: Date;
    let fechaFin: Date = ahora;
    let fechaInicioAnt: Date;
    let fechaFinAnt: Date;

    if (periodo === "trimestre") {
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 3, 1);
      fechaInicioAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 6, 1);
      fechaFinAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 3, 0, 23, 59, 59, 999);
    } else if (periodo === "anio_actual") {
      fechaInicio = new Date(ahora.getFullYear(), 0, 1);
      fechaInicioAnt = new Date(ahora.getFullYear() - 1, 0, 1);
      fechaFinAnt = new Date(ahora.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else {
      // Mes actual por defecto
      fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      fechaInicioAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      fechaFinAnt = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999);
    }

    // 1. Resumen Operativo de Flota y Personal
    const [
      vehiculos,
      pilotos,
      otsEnProcesoCount
    ] = await Promise.all([
      prisma.vehiculo.findMany({
        select: { id_vehiculo: true, estado: true, activo: true }
      }),
      prisma.piloto.findMany({
        where: { activo: true },
        select: { id_piloto: true, disponible: true }
      }),
      prisma.ordenServicio.count({
        where: { activo: true, estado: "En Proceso" }
      })
    ]);

    const totalVehiculos = vehiculos.filter(v => v.activo).length;
    const vehiculosEnRuta = vehiculos.filter(v => v.activo && v.estado === "En Ruta").length;
    const vehiculosDisponibles = vehiculos.filter(v => v.activo && v.estado === "Disponible").length;
    const vehiculosEnTaller = vehiculos.filter(v => v.activo && v.estado === "En Mantenimiento").length;
    const vehiculosFueraServicio = vehiculos.filter(v => !v.activo || v.estado === "Fuera de Servicio").length;

    const totalPilotos = pilotos.length;
    const pilotosDisponibles = pilotos.filter(p => p.disponible).length;

    // 2. Resumen Financiero (Ventas y Cobros)
    const [
      ventasPeriodo,
      ventasPeriodoAnt,
      facturasPendientes
    ] = await Promise.all([
      prisma.venta.findMany({
        where: {
          activo: true,
          estado_pago: { not: "Anulada" },
          fecha_emision: { gte: fechaInicio, lte: fechaFin }
        },
        select: { total: true, estado_pago: true }
      }),
      prisma.venta.findMany({
        where: {
          activo: true,
          estado_pago: { not: "Anulada" },
          fecha_emision: { gte: fechaInicioAnt, lte: fechaFinAnt }
        },
        select: { total: true }
      }),
      prisma.venta.findMany({
        where: { activo: true, estado_pago: "Pendiente" },
        select: { total: true }
      })
    ]);

    const totalVentasPeriodo = ventasPeriodo.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const totalVentasPeriodoAnt = ventasPeriodoAnt.reduce((acc, v) => acc + Number(v.total || 0), 0);
    
    // Calcular tendencia porcentual
    let tendenciaVentas = 0;
    if (totalVentasPeriodoAnt > 0) {
      tendenciaVentas = Number((((totalVentasPeriodo - totalVentasPeriodoAnt) / totalVentasPeriodoAnt) * 100).toFixed(1));
    }

    const totalPendientesMonto = facturasPendientes.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const totalPendientesCount = facturasPendientes.length;

    // 3. Resumen de Taller y Costos Mecánicos
    const [
      otsPeriodo,
      otsPeriodoAnt
    ] = await Promise.all([
      prisma.ordenServicio.findMany({
        where: {
          activo: true,
          estado: "Completada",
          fecha_ingreso: { gte: fechaInicio, lte: fechaFin }
        },
        select: { costo_total: true }
      }),
      prisma.ordenServicio.findMany({
        where: {
          activo: true,
          estado: "Completada",
          fecha_ingreso: { gte: fechaInicioAnt, lte: fechaFinAnt }
        },
        select: { costo_total: true }
      })
    ]);

    const totalCostosTaller = otsPeriodo.reduce((acc, o) => acc + Number(o.costo_total || 0), 0);
    const totalCostosTallerAnt = otsPeriodoAnt.reduce((acc, o) => acc + Number(o.costo_total || 0), 0);

    let tendenciaTaller = 0;
    if (totalCostosTallerAnt > 0) {
      tendenciaTaller = Number((((totalCostosTaller - totalCostosTallerAnt) / totalCostosTallerAnt) * 100).toFixed(1));
    }

    // 4. Resumen de Inventario y Repuestos Críticos
    const [
      todosProductos,
      repuestosCriticos
    ] = await Promise.all([
      prisma.producto.findMany({
        where: { activo: true },
        select: { stock: true, stock_minimo: true, precio_compra: true }
      }),
      prisma.producto.findMany({
        where: {
          activo: true,
          stock: { lte: prisma.producto.fields.stock_minimo }
        },
        include: {
          categoria: { select: { nombre: true } }
        },
        orderBy: { stock: "asc" },
        take: 5
      })
    ]);

    const totalProductos = todosProductos.length;
    const repuestosCriticosCount = todosProductos.filter(p => p.stock <= p.stock_minimo).length;
    const valorInventario = todosProductos.reduce((acc, p) => acc + (p.stock * Number(p.precio_compra || 0)), 0);

    // 5. Histórico para Gráfico Comparativo Mensual (Últimos 6 meses)
    const mesesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const seisMesesAtras = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);

    const [ventas6Meses, ots6Meses] = await Promise.all([
      prisma.venta.findMany({
        where: {
          activo: true,
          estado_pago: { not: "Anulada" },
          fecha_emision: { gte: seisMesesAtras }
        },
        select: { total: true, fecha_emision: true }
      }),
      prisma.ordenServicio.findMany({
        where: {
          activo: true,
          estado: "Completada",
          fecha_ingreso: { gte: seisMesesAtras }
        },
        select: { costo_total: true, fecha_ingreso: true }
      })
    ]);

    const comparativoMensual = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mIndex = d.getMonth();
      const aNum = d.getFullYear();
      const mesLabel = `${mesesNombres[mIndex]} ${aNum.toString().slice(-2)}`;

      const ventasMes = ventas6Meses
        .filter(v => {
          const vd = new Date(v.fecha_emision);
          return vd.getMonth() === mIndex && vd.getFullYear() === aNum;
        })
        .reduce((s, v) => s + Number(v.total || 0), 0);

      const costosMes = ots6Meses
        .filter(o => {
          const od = new Date(o.fecha_ingreso);
          return od.getMonth() === mIndex && od.getFullYear() === aNum;
        })
        .reduce((s, o) => s + Number(o.costo_total || 0), 0);

      comparativoMensual.push({
        mes: mesLabel,
        ingresos: Number(ventasMes.toFixed(2)),
        costos: Number(costosMes.toFixed(2)),
        margen: Number((ventasMes - costosMes).toFixed(2))
      });
    }

    // 6. Top 5 Repuestos más consumidos en Taller
    const ordenesRepuestos = await prisma.ordenRepuesto.groupBy({
      by: ["id_producto"],
      _sum: {
        cantidad: true,
        subtotal: true
      },
      orderBy: {
        _sum: {
          cantidad: "desc"
        }
      },
      take: 5
    });

    const topRepuestosConsumo = await Promise.all(
      ordenesRepuestos.map(async r => {
        const prod = await prisma.producto.findUnique({
          where: { id_producto: r.id_producto },
          select: { descripcion: true, codigo: true, unidad_medida: true }
        });
        return {
          id_producto: r.id_producto,
          codigo: prod?.codigo || "N/A",
          descripcion: prod?.descripcion || `Repuesto #${r.id_producto}`,
          unidad_medida: prod?.unidad_medida || "Unidad",
          cantidad: r._sum.cantidad || 0,
          total_gastado: Number(r._sum.subtotal || 0)
        };
      })
    );

    // 7. Últimas 5 Órdenes de Trabajo del Taller
    const ultimasOTs = await prisma.ordenServicio.findMany({
      where: { activo: true },
      include: {
        vehiculo: { select: { placa: true, marca: true, modelo: true } },
        mecanico: { select: { nombre: true, apellido: true } }
      },
      orderBy: { id_orden: "desc" },
      take: 5
    });

    return res.status(200).json({
      periodo,
      operativo: {
        totalVehiculos,
        vehiculosEnRuta,
        vehiculosDisponibles,
        vehiculosEnTaller,
        vehiculosFueraServicio,
        totalPilotos,
        pilotosDisponibles,
        otsEnProcesoCount
      },
      financiero: {
        totalVentasPeriodo: Number(totalVentasPeriodo.toFixed(2)),
        tendenciaVentas,
        totalPendientesMonto: Number(totalPendientesMonto.toFixed(2)),
        totalPendientesCount,
        totalCostosTaller: Number(totalCostosTaller.toFixed(2)),
        tendenciaTaller,
        utilidadEstimada: Number((totalVentasPeriodo - totalCostosTaller).toFixed(2))
      },
      inventario: {
        totalProductos,
        repuestosCriticosCount,
        valorInventario: Number(valorInventario.toFixed(2)),
        repuestosPorReabastecer: repuestosCriticos.map(p => ({
          id_producto: p.id_producto,
          codigo: p.codigo,
          descripcion: p.descripcion,
          categoria: p.categoria?.nombre || "Sin Categoría",
          stock: p.stock,
          stock_minimo: p.stock_minimo,
          precio_compra: Number(p.precio_compra)
        }))
      },
      graficos: {
        comparativoMensual,
        distribucionFlota: [
          { name: "En Ruta", value: vehiculosEnRuta, color: "#2563EB" },
          { name: "Disponible", value: vehiculosDisponibles, color: "#10B981" },
          { name: "En Taller", value: vehiculosEnTaller, color: "#F59E0B" },
          { name: "Fuera de Servicio", value: vehiculosFueraServicio, color: "#EF4444" }
        ],
        topRepuestosConsumo
      },
      ultimasOTs: ultimasOTs.map(o => ({
        id_orden: o.id_orden,
        numero_ot: o.numero_ot || `OT #${o.id_orden}`,
        placa: o.vehiculo?.placa || "N/A",
        vehiculo_desc: `${o.vehiculo?.marca || ""} ${o.vehiculo?.modelo || ""}`.trim(),
        mecanico: `${o.mecanico?.nombre || ""} ${o.mecanico?.apellido || ""}`.trim(),
        tipo_mantenimiento: o.tipo_mantenimiento,
        estado: o.estado,
        costo_total: Number(o.costo_total || 0),
        fecha_ingreso: o.fecha_ingreso
      }))
    });
  } catch (error: any) {
    console.error("[Dashboard] Error en getDashboardOverview:", error);
    return res.status(500).json({ error: "Error al generar datos del Dashboard principal." });
  }
};
