import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Les tests d'integration touchent une base reelle : pas de parallelisme.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://sanarys:sanarys@localhost:5432/sanarys_dev",
    },
  },
});
