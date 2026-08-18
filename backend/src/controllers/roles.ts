import { Request, Response } from "express";
import prisma from "../config/prisma";

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.rol.findMany({
      select: {
        id_rol: true,
        nombre: true,
        descripcion: true
      }
    });
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error getRoles:", error);
    return res.status(500).json({ error: "Error al obtener roles." });
  }
};
