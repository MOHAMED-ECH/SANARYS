import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

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
  private readonly root: string;

  constructor(baseDir: string) {
    this.root = resolve(baseDir);
  }

  private resolveKey(key: string): string {
    if (!key.trim() || key.includes("\0") || isAbsolute(key)) {
      throw new Error(`Cle de stockage invalide: ${key}`);
    }

    const target = resolve(this.root, key);
    const pathFromRoot = relative(this.root, target);
    if (!pathFromRoot || pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
      throw new Error(`Cle de stockage invalide: ${key}`);
    }

    return target;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<void> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true });
  }
}

export function createStorageAdapter(baseDir: string): StoragePort {
  return new LocalDiskStorageAdapter(baseDir);
}
