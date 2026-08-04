import { buildApp } from "./app.js";
import { env } from "./env.js";

const app = await buildApp();

try {
  await app.listen({ port: env.API_PORT, host: env.API_HOST });
  app.log.info(`SANARYS API demarree sur :${env.API_PORT} (docs: /docs)`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
