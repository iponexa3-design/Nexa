import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { prisma } from "../src/db/prisma";
import { fillRegistrars } from "../src/services/registrar-service";

/**
 * Looks up the registrar of recent IPOs on NSE now, instead of waiting for
 * the daily refresh (which does the same).
 *
 *   npm run registrars:fill
 */
async function main() {
  const result = await fillRegistrars();
  console.log(`Registrars saved: ${result.filled} of ${result.candidates} IPOs checked.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
