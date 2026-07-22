import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { db } from './server/db';

async function main() {
  await db.ready();
  const jsonPath = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\71af1868-75b9-4207-9e7c-576191fa1828\\scratch\\collaborators.json';
  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const collaborators = JSON.parse(rawData);

  // 1. Delete the old default admin user (id: '1')
  console.log("Eliminando usuario administrador antiguo (ID: '1')...");
  await db.deleteUser('1');

  // 2. Insert or update collaborators
  console.log(`Cargando ${collaborators.length} colaboradores con género (sexo) en la base de datos...`);

  for (const col of collaborators) {
    const existing = db.getUsers().find(u => u.id === col.id || u.username === col.username);
    if (!existing) {
      console.log(`[NUEVO] Agregando colaborador: ${col.name} (${col.username})`);
      await db.addUser(col);
    } else {
      console.log(`[EXISTE] Colaborador ${col.username} ya existe, actualizando datos y género...`);
      await db.updateUser(existing.id, {
        name: col.name,
        cargo: col.cargo,
        areaId: col.areaId,
        areaIds: col.areaIds,
        role: col.id === '74223117' ? col.role : (existing.role === 'Consulta' ? col.role : existing.role),
        sexo: col.sexo
      });
    }
  }

  // 3. Ensure the new 'admin' master administrator is created
  const adminUser = {
    id: 'admin',
    username: 'admin',
    name: 'Administrador General',
    role: 'Administrador' as const,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    password: '1012',
    areaId: 'dir',
    areaIds: ['dir'],
    cargo: 'Administrador del Sistema'
  };

  const existingAdmin = db.getUsers().find(u => u.id === 'admin' || u.username === 'admin');
  if (!existingAdmin) {
    console.log(`[ADMIN] Creando usuario administrador general 'admin' con clave '1012'...`);
    await db.addUser(adminUser);
  } else {
    console.log(`[ADMIN] Actualizando usuario administrador general 'admin' con clave '1012'...`);
    await db.updateUser('admin', adminUser);
  }

  console.log('¡Sincronización de base de datos completada con éxito!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error durante la siembra:', err);
  process.exit(1);
});
