// Copia los assets de Bootstrap desde node_modules/ a public/vendor/bootstrap/.
// Uso: npm run bootstrap
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const origen = "node_modules/bootstrap/dist";
const destino = "public/vendor/bootstrap";

const copiar = [
  ["css/bootstrap.min.css", "css/bootstrap.min.css"],
  ["js/bootstrap.bundle.min.js", "js/bootstrap.bundle.min.js"],
];

if (!existsSync(origen)) {
  console.error(`No se encontró ${origen}. Ejecutá antes: npm install`);
  process.exit(1);
}

for (const [relOrigen, relDestino] of copiar) {
  const d = `${destino}/${relDestino}`;
  await mkdir(dirname(d), { recursive: true });
  await cp(`${origen}/${relOrigen}`, d);
  console.log(`Copiado: ${relOrigen} -> ${d}`);
}

console.log("Bootstrap copiado a public/vendor/bootstrap/ ✔");