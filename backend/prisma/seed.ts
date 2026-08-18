import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Crear Roles si no existen
  const superAdminRole = await prisma.rol.upsert({
    where: { nombre: 'Superadministrador' },
    update: {},
    create: {
      nombre: 'Superadministrador',
      descripcion: 'Acceso total al sistema',
    },
  });

  const gerenteRole = await prisma.rol.upsert({
    where: { nombre: 'Gerente' },
    update: {},
    create: {
      nombre: 'Gerente',
      descripcion: 'Acceso de gestión de la empresa',
    },
  });

  // ⚠️  CONTRASEÑA TEMPORAL DE SEED — Cambiar inmediatamente tras el primer deploy.
  // Esta contraseña ('admin123') es solo para inicializar el sistema en desarrollo.
  // Acceder al panel de administración y actualizarla antes de usar en producción.
  const hashedPassword = await bcrypt.hash('admin123', 10);


  // Crear Usuario Admin 1
  const admin1 = await prisma.usuario.upsert({
    where: { usuario: 'admin1' },
    update: {},
    create: {
      nombre: 'Administrador Principal',
      usuario: 'admin1',
      correo: 'admin1@myvektor.com',
      contrasena: hashedPassword,
      id_rol: superAdminRole.id_rol,
      activo: true,
    },
  });

  // Crear Usuario Admin 2
  const admin2 = await prisma.usuario.upsert({
    where: { usuario: 'admin2' },
    update: {},
    create: {
      nombre: 'Administrador Secundario',
      usuario: 'admin2',
      correo: 'admin2@myvektor.com',
      contrasena: hashedPassword,
      id_rol: superAdminRole.id_rol,
      activo: true,
    },
  });

  console.log('Seeding completado con éxito:');
  console.log({ admin1: admin1.usuario, admin2: admin2.usuario });
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
