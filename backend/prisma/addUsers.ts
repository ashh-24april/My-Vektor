import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const superAdminRole = await prisma.rol.findUnique({
    where: { nombre: 'Superadministrador' },
  });

  if (!superAdminRole) {
    throw new Error('El rol Superadministrador no existe en la base de datos.');
  }

  // Usuario 1
  const hash1 = await bcrypt.hash('S@ra!1204', 10);
  const user1 = await prisma.usuario.upsert({
    where: { usuario: 'apineda' },
    update: {
      nombre: 'Ashlly Saraí Pineda Belloso',
      contrasena: hash1,
      id_rol: superAdminRole.id_rol,
      activo: true,
    },
    create: {
      nombre: 'Ashlly Saraí Pineda Belloso',
      usuario: 'apineda',
      correo: 'apineda@myvektor.com', // Correo por defecto
      contrasena: hash1,
      id_rol: superAdminRole.id_rol,
      activo: true,
    },
  });

  // Usuario 2
  const hash2 = await bcrypt.hash('Hebtt282026', 10);
  const user2 = await prisma.usuario.upsert({
    where: { usuario: 'hcalderon' },
    update: {
      nombre: 'Herbert Ovidio Calderon Alvarado',
      contrasena: hash2,
      id_rol: superAdminRole.id_rol,
      activo: true,
    },
    create: {
      nombre: 'Herbert Ovidio Calderon Alvarado',
      usuario: 'hcalderon',
      correo: 'hcalderon@myvektor.com', // Correo por defecto
      contrasena: hash2,
      id_rol: superAdminRole.id_rol,
      activo: true,
    },
  });

  console.log('Nuevos usuarios creados con éxito:');
  console.log(user1.usuario);
  console.log(user2.usuario);
}

main()
  .catch((e) => {
    console.error('Error al crear usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
