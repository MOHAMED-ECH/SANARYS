import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createStorageAdapter } from "./index.js";

let root: string | null = null;

async function storageRoot(): Promise<string> {
  root = await mkdtemp(join(tmpdir(), "sanarys-storage-"));
  return root;
}

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = null;
});

describe("LocalDiskStorageAdapter", () => {
  it("stocke et relit une cle relative sous la racine de stockage", async () => {
    const baseDir = await storageRoot();
    const storage = createStorageAdapter(baseDir);

    await storage.put("contracts/demo.pdf", Buffer.from("pdf"), "application/pdf");

    await expect(storage.get("contracts/demo.pdf")).resolves.toEqual(Buffer.from("pdf"));
    await expect(readFile(resolve(baseDir, "contracts/demo.pdf"))).resolves.toEqual(
      Buffer.from("pdf"),
    );
  });

  it("refuse les cles qui sortent de la racine de stockage", async () => {
    const storage = createStorageAdapter(await storageRoot());

    await expect(storage.put("../secret.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow(
      "Cle de stockage invalide",
    );
    await expect(storage.get("contracts/../../secret.pdf")).rejects.toThrow(
      "Cle de stockage invalide",
    );
  });

  it("refuse les cles absolues et vides", async () => {
    const storage = createStorageAdapter(await storageRoot());

    await expect(storage.get(resolve("ailleurs.pdf"))).rejects.toThrow("Cle de stockage invalide");
    await expect(storage.get("   ")).rejects.toThrow("Cle de stockage invalide");
  });
});
