import { Injectable, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  async onModuleInit() { await this.$connect(); }
  // Jobs drain in onModuleDestroy while database/storage dependencies remain alive.
  async onApplicationShutdown() { await this.$disconnect(); }
  async audit(actorId: string | null, action: string, targetId?: string) {
    await this.auditEvent.create({ data: { actorId, action, targetId } });
  }
}
