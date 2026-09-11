// Instancia única de PrismaClient (MODELO).
// Prisma 7 usa un adapter explícito; para MySQL se usa PrismaMariaDb (@prisma/adapter-mariadb,
// driver compatible con el protocolo de MySQL 8). La URL se pasa como string y el propio
// adapter la convierte a opciones de pool.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";
if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en el archivo .env (ver .env.example)");
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);

export const db = new PrismaClient({ adapter });