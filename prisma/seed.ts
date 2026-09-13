// Seed de datos de ejemplo (Fase 1): 1 álbum con láminas que cubren los
// tres estados del BRIEF §7 — cantidad 0 (FALTANTE), 1 (ÚNICA) y ≥2 (REPETIDA).
// Ejecutar con: npx prisma db seed  (script configurado en prisma7.config.ts)
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en el archivo .env (ver .env.example)");
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
  const albumCount = await prisma.album.count();
  if (albumCount > 0) {
    console.log("Seed ya aplicado: la base ya tiene álbumes; nada que hacer.");
    return;
  }

  await prisma.album.create({
    data: {
      nombre: "Copa Mundial 2026",
      imagen: "/public/img/copa-mundial-2026.png",
      fechaLanzamiento: new Date("2026-06-14"),
      tipoLaminas: "Fútbol",
      descripcion: "Álbum oficial del Mundial 2026: selecciones y figuras.",
      laminas: {
        create: [
          { numero: 1, nombre: "Lionel Messi", tipo: "EPICA", cantidad: 0 },
          { numero: 2, nombre: "Diego Maradona", tipo: "LEGENDARIA", cantidad: 3, imagen: "/public/img/maradona.png" },
          { numero: 3, nombre: "Ángel Di María", tipo: "RARA", cantidad: 1 },
          { numero: 4, nombre: "Emiliano Martínez", tipo: "COMUN", cantidad: 2 },
          { numero: 5, nombre: "Julián Álvarez", tipo: "COMUN", cantidad: 0 },
          { numero: 6, nombre: "Kylian Mbappé", tipo: "EPICA", cantidad: 1 },
        ],
      },
    },
  });

  console.log(
    "Seed aplicado: álbum 'Copa Mundial 2026' con 6 láminas (0, 1, 2 y 3 copias).",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });