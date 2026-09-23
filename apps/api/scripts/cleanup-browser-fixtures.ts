import '../src/config';
import { PrismaService } from '../src/prisma.service';
import { StorageService } from '../src/storage.service';
import { DeletionService } from '../src/deletion.service';

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.CLEANUP_BROWSER_FIXTURES !== 'true') throw new Error('Explicit development-only fixture cleanup flag is required.');
  const db = new PrismaService(); await db.$connect();
  const deletion = new DeletionService(db, new StorageService());
  try {
    const cutoff = new Date(Date.now() - 3 * 3600000);
    const candidates = await db.user.findMany({ where: { name: { in: ['Browser Test', 'Photo Test'] }, createdAt: { gt: cutoff }, deletedAt: null } });
    const exact = candidates.filter(user => {
      const match = /^(browser|photo)-(\d{13})-[a-f0-9]{6,8}@example\.com$/.exec(user.email);
      if (!match || !((match[1] === 'browser' && user.name === 'Browser Test') || (match[1] === 'photo' && user.name === 'Photo Test'))) return false;
      return Math.abs(user.createdAt.getTime() - Number(match[2])) < 5 * 60000;
    });
    for (const user of exact) await deletion.request(user.id, 'ACCOUNT');
    await deletion.cleanup();
    const remaining = await db.user.count({ where: { id: { in: exact.map(user => user.id) } } });
    if (remaining) throw new Error('Some fixture cleanup requests remain pending.');
    console.log(`Deleted ${exact.length} strictly matched recent browser fixture accounts and their private data.`);
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Fixture cleanup failed'); process.exitCode = 1; });
