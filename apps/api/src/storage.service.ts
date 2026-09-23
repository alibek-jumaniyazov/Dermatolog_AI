import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile, unlink, access, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config';

@Injectable()
export class StorageService implements OnModuleInit, OnApplicationShutdown {
  private readonly s3 = process.env.STORAGE_DRIVER === 's3' ? new S3Client({ region: process.env.S3_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT, forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY || '', secretAccessKey: process.env.S3_SECRET_KEY || '' } }) : null;
  private readonly bucket = process.env.S3_BUCKET || 'dermatolog-private';
  async onModuleInit() { await this.ready(); }
  onApplicationShutdown() { this.s3?.destroy(); }
  private async localDirectory() {
    await mkdir(config.storagePath, { recursive: true, mode: 0o700 });
    if (config.production && process.platform !== 'win32') {
      const directory = await stat(config.storagePath);
      if ((directory.mode & 0o077) !== 0) throw new Error('Production storage directory must have private permissions (0700).');
    }
  }
  key(extension: 'jpg' | 'png' | 'pdf') { return `${randomUUID()}.${extension}`; }
  private path(key: string) {
    if (!/^[a-f0-9-]+\.(jpg|png|pdf)$/.test(key)) throw new Error('Invalid private storage key');
    const path = resolve(config.storagePath, key);
    if (!path.startsWith(config.storagePath + sep)) throw new Error('Storage path escaped root');
    return path;
  }
  async put(key: string, data: Buffer, mimeType: string) {
    if (this.s3) { await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: mimeType, ServerSideEncryption: process.env.S3_ENCRYPTION === 'AES256' ? 'AES256' : undefined })); return; }
    await this.localDirectory();
    await writeFile(this.path(key), data, { flag: 'wx', mode: 0o600 });
  }
  async read(key: string): Promise<Buffer> {
    if (this.s3) {
      const result = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) throw new Error('Object missing');
      return Buffer.from(await result.Body.transformToByteArray());
    }
    return readFile(this.path(key));
  }
  async remove(key: string) {
    if (this.s3) { await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); return; }
    try { await unlink(this.path(key)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  async ready() {
    if (this.s3) await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    else { await this.localDirectory(); await access(config.storagePath, constants.W_OK | constants.R_OK); }
    return true;
  }
  async *staleKeys(before: Date): AsyncGenerator<string[]> {
    if (this.s3) {
      let continuation: string | undefined;
      do {
        const result = await this.s3.send(new ListObjectsV2Command({ Bucket: this.bucket, ContinuationToken: continuation, MaxKeys: 100 }));
        yield (result.Contents || []).filter(item => item.Key && item.LastModified && item.LastModified < before && /^[a-f0-9-]+\.(jpg|png|pdf)$/.test(item.Key)).map(item => item.Key!);
        continuation = result.NextContinuationToken;
      } while (continuation);
      return;
    }
    await this.localDirectory();
    let batch: string[] = [];
    for (const entry of await readdir(config.storagePath, { withFileTypes: true })) {
      if (!entry.isFile() || !/^[a-f0-9-]+\.(jpg|png|pdf)$/.test(entry.name)) continue;
      const metadata = await stat(this.path(entry.name)).catch(() => null);
      if (metadata && metadata.mtime < before) batch.push(entry.name);
      if (batch.length >= 100) { yield batch; batch = []; }
    }
    if (batch.length) yield batch;
  }
}
