import { afterEach, expect, it, vi } from 'vitest';
import { JobsService } from '../src/jobs.service';
import { PrismaService } from '../src/prisma.service';
import { StorageService } from '../src/storage.service';
import { MlService } from '../src/ml.service';
import { DeletionService } from '../src/deletion.service';

afterEach(() => { vi.unstubAllEnvs(); });
it('shutdown waits for an active local inference and stops claiming the next pending job', async () => {
  vi.stubEnv('REDIS_URL', ''); vi.stubEnv('RUN_WORKER_IN_API', 'true');
  const findMany = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'first' }, { id: 'second' }]);
  const db = { analysisJob: { findMany } } as unknown as PrismaService;
  const jobs = new JobsService(db, {} as StorageService, {} as MlService, { cleanup: vi.fn().mockResolvedValue(undefined) } as unknown as DeletionService);
  let release!: () => void; let started!: () => void;
  const active = new Promise<void>(resolve => { release = resolve; });
  const start = new Promise<void>(resolve => { started = resolve; });
  const process = vi.spyOn(jobs, 'process').mockImplementation(async () => { started(); await active; });
  await jobs.onModuleInit(); await start;
  let stopped = false; const shutdown = jobs.onModuleDestroy().then(() => { stopped = true; });
  await Promise.resolve(); expect(stopped).toBe(false);
  release(); await shutdown;
  expect(stopped).toBe(true); expect(process).toHaveBeenCalledTimes(1); expect(process).toHaveBeenCalledWith('first');
});
