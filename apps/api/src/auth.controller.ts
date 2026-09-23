import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService, publicUser } from './auth.service';
import { AuthRequest, fail, Public } from './common';
import { EmailDto, LoginDto, ProfileDto, RegisterDto, ResetDto } from './dto';
import { PrismaService } from './prisma.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post('register') register(@Body() body: RegisterDto, @Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) { return this.auth.register(body, request, response); }
  @Public() @Post('login') login(@Body() body: LoginDto, @Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) { return this.auth.login(body, request, response); }
  @Public() @Post('refresh') refresh(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) { return this.auth.refresh(request, response); }
  @Public() @Post('logout') logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) { return this.auth.logout(request, response); }
  @Public() @Post('forgot-password') forgot(@Body() body: EmailDto) { return this.auth.forgot(body.email); }
  @Public() @Post('reset-password') reset(@Body() body: ResetDto) { return this.auth.reset(body.token, body.password); }
}

@ApiBearerAuth() @ApiTags('Profile') @Controller('me')
export class ProfileController {
  constructor(private readonly db: PrismaService) {}
  @Get() async me(@Req() req: AuthRequest) { return publicUser(await this.db.user.findUniqueOrThrow({ where: { id: req.user.id } })); }
  @Patch() async update(@Req() req: AuthRequest, @Body() dto: ProfileDto) { return publicUser(await this.db.user.update({ where: { id: req.user.id }, data: { name: dto.name.trim() } })); }
  @Get('sessions') async sessions(@Req() req: AuthRequest) {
    const sessions = await this.db.session.findMany({ where: { userId: req.user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    return { items: sessions.map(s => ({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt, current: s.id === req.user.sessionId })), nextCursor: null };
  }
  @Delete('sessions/:id') async revoke(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    const result = await this.db.session.updateMany({ where: { id, userId: req.user.id }, data: { revokedAt: new Date() } });
    if (!result.count) fail(404, 'NOT_FOUND', 'Sessiya topilmadi.');
    return { ok: true };
  }
}
