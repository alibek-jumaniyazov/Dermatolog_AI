import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import nodemailer from 'nodemailer';
import { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { AuthRequest, fail } from './common';
import { config } from './config';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export const publicUser = (user: User) => ({ id: user.id, name: user.name, email: user.email, role: user.role, isDemo: user.isDemo, createdAt: user.createdAt });

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService) {}

  async register(data: { name: string; email: string; password: string }, request: Request, response: Response) {
    const email = data.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
    let user: User;
    try { user = await this.db.user.create({ data: { email, name: data.name.trim(), passwordHash } }); }
    catch (error) {
      if ((error as { code?: string }).code === 'P2002') fail(409, 'EMAIL_EXISTS', 'Bu email bilan hisob mavjud.');
      throw error;
    }
    await this.db.audit(user.id, 'REGISTER', user.id);
    return this.issue(user, request, response);
  }

  async login(data: { email: string; password: string }, request: Request, response: Response) {
    const user = await this.db.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (!user || user.deletedAt || (config.production && user.isDemo) || !await argon2.verify(user.passwordHash, data.password)) fail(401, 'INVALID_CREDENTIALS', 'Email yoki parol noto‘g‘ri.');
    await this.db.audit(user.id, 'LOGIN');
    return this.issue(user, request, response);
  }

  private cookie(response: Response, value: string, expires?: Date) {
    response.cookie('rd_refresh', value, { httpOnly: true, secure: config.production, sameSite: 'strict', path: '/api/v1/auth', ...(expires ? { expires } : { maxAge: 0 }) });
  }

  private async issue(user: User, request: Request, response: Response) {
    if (config.production && user.isDemo) fail(403, 'DEMO_DISABLED', 'Demo hisob production muhitida ishlamaydi.');
    const token = randomBytes(48).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 86400000);
    const session = await this.db.session.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt, userAgent: request.get('user-agent')?.slice(0, 200) } });
    this.cookie(response, token, expiresAt);
    return { user: publicUser(user), accessToken: await this.jwt.signAsync({ sub: user.id, sid: session.id, role: user.role }) };
  }

  async refresh(request: Request, response: Response) {
    const token = request.cookies?.rd_refresh;
    if (!token || typeof token !== 'string') fail(401, 'SESSION_EXPIRED', 'Qaytadan hisobingizga kiring.');
    const session = await this.db.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
    if (!session || session.user.deletedAt || (config.production && session.user.isDemo) || session.expiresAt < new Date()) { this.cookie(response, ''); fail(401, 'SESSION_EXPIRED', 'Sessiya muddati tugagan.'); }
    if (session.revokedAt) {
      await this.db.session.updateMany({ where: { userId: session.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      this.cookie(response, '');
      fail(401, 'SESSION_REUSED', 'Sessiya bekor qilingan. Qaytadan kiring.');
    }
    const rotated = await this.db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (rotated.count !== 1) fail(401, 'SESSION_EXPIRED', 'Sessiya yangilangan. Qaytadan kiring.');
    return this.issue(session.user, request, response);
  }

  async logout(request: Request, response: Response) {
    const token = request.cookies?.rd_refresh;
    if (typeof token === 'string') await this.db.session.updateMany({ where: { tokenHash: hash(token), revokedAt: null }, data: { revokedAt: new Date() } });
    this.cookie(response, '');
    return { ok: true };
  }

  async forgot(email: string) {
    if (!process.env.SMTP_HOST) fail(503, 'EMAIL_NOT_CONFIGURED', 'Parolni tiklash uchun email xizmati sozlanmagan.');
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (user && !user.deletedAt && !(config.production && user.isDemo)) {
      const token = randomBytes(48).toString('base64url');
      const reset = await this.db.resetToken.create({ data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 60000) } });
      const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', requireTLS: config.smtpRequireTls,
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000, tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
        ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } : {}) });
      try {
        await transport.sendMail({ from: process.env.SMTP_FROM || 'noreply@localhost', to: user.email, subject: 'Raqamli Dermatolog — parolni tiklash', text: `Parolingizni 30 daqiqa ichida ushbu havola orqali yangilang: ${config.origin}/reset-password?token=${encodeURIComponent(token)}\nAgar so‘rovni siz yubormagan bo‘lsangiz, xatni e’tiborsiz qoldiring.` });
      } catch {
        await this.db.resetToken.delete({ where: { id: reset.id } });
        fail(503, 'EMAIL_UNAVAILABLE', 'Email yuborish bajarilmadi. Keyinroq urinib ko‘ring.');
      }
    }
    return { message: 'Agar email hisobga tegishli bo‘lsa, tiklash havolasi yuborildi.' };
  }

  async reset(token: string, password: string) {
    const reset = await this.db.resetToken.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date() || reset.user.deletedAt || (config.production && reset.user.isDemo)) fail(400, 'RESET_INVALID', 'Tiklash havolasi yaroqsiz yoki muddati tugagan.');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await this.db.$transaction(async tx => {
      const claimed = await tx.resetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (!claimed.count) fail(400, 'RESET_INVALID', 'Tiklash havolasi ishlatilgan.');
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await tx.session.updateMany({ where: { userId: reset.userId }, data: { revokedAt: new Date() } });
      await tx.resetToken.updateMany({ where: { userId: reset.userId }, data: { usedAt: new Date() } });
    });
    return { ok: true };
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('public', [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
    if (!token) fail(401, 'AUTH_REQUIRED', 'Hisobingizga kiring.');
    let payload: { sub: string; sid: string };
    try { payload = await this.jwt.verifyAsync(token); } catch { fail(401, 'TOKEN_EXPIRED', 'Kirish tokeni yaroqsiz yoki eskirgan.'); }
    const session = await this.db.session.findFirst({ where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() }, user: { deletedAt: null } }, include: { user: true } });
    if (!session || (config.production && session.user.isDemo)) fail(401, 'SESSION_EXPIRED', 'Sessiya bekor qilingan. Qaytadan kiring.');
    request.user = { id: session.userId, sessionId: session.id, role: session.user.role };
    if (this.reflector.getAllAndOverride<boolean>('admin', [context.getHandler(), context.getClass()]) && session.user.role !== 'ADMIN') fail(403, 'FORBIDDEN', 'Bu bo‘lim uchun ruxsat mavjud emas.');
    return true;
  }
}
