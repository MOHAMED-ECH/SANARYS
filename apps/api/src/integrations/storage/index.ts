import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

/**
 * Interface de stockage objet, calquee sur la forme d'un client S3 (put/get/delete
 * par cle) pour qu'un adaptateur S3-compatible reel se substitue en un seul fichier.
 *
 * STATUT DANS CE BUILD : adaptateur disque local (apps/api/var/storage, gitignore).
 * En production : stockage objet durable, chiffrement, URLs signees temporaires,
 * sauvegarde/retention, antivirus sur les televersements (cf. plan, revue 3.4).
 */
export interface StoragePort {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalDiskStorageAdapter implements StoragePort {
  constructor(private readonly baseDir: string) {}

  private resolve(key: string): string {
    const safe = normalize(key).replace(/^(\.\.[/\\])+/, "");
    if (safe.includes("..")) {
      throw new Error(`Cle de stockage invalide: ${key}`);
    }
    return join(this.baseDir, safe);
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

export function createStorageAdapter(baseDir: string): StoragePort {
  return new LocalDiskStorageAdapter(baseDir);
}
