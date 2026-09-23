import { Body, CanActivate, Controller, Delete, ExecutionContext, Get, HttpCode, Injectable, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as argon2 from 'argon2';
import { AnalysesService } from './analyses.service';
import { AnalysisDto, CaseDto, ConsentDto, PasswordDto, RoiDto, SubmitDto, SymptomsDto } from './dto';
import { AuthRequest, fail } from './common';
import { DeletionService } from './deletion.service';
import { ReportsService } from './reports.service';
import { PrismaService } from './prisma.service';
import { publicUser } from './auth.service';

@Injectable()
export class ProcessingConsentGuard implements CanActivate {
  constructor(private readonly analyses: AnalysesService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const item = await this.analyses.own(req.user.id, String(req.params.id));
    if (!item.processingConsent) fail(403, 'CONSENT_REQUIRED', 'Avval qayta ishlashga rozilik bering.');
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > 31 * 1024 * 1024) fail(413, 'UPLOAD_TOO_LARGE', 'Jami yuklama 30 MiB dan oshmasin.');
    return true;
  }
}

@ApiBearerAuth() @ApiTags('Cases') @Controller('cases')
export class CasesController {
  constructor(private readonly analyses: AnalysesService, private readonly deletion: DeletionService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: Record<string, string>) { return this.analyses.listCases(req.user.id, query); }
  @Post() create(@Req() req: AuthRequest, @Body() dto: CaseDto) { return this.analyses.createCase(req.user.id, dto); }
  @Get(':id') get(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.analyses.getCase(req.user.id, id); }
  @Delete(':id') @HttpCode(202) remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.deletion.request(req.user.id, 'CASE', id); }
  @Get(':id/compare') compare(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Query('left', ParseUUIDPipe) left: string, @Query('right', ParseUUIDPipe) right: string) { return this.analyses.compare(req.user.id, id, left, right); }
}

@ApiBearerAuth() @ApiTags('Analyses') @Controller('analyses')
export class AnalysesController {
  constructor(private readonly analyses: AnalysesService, private readonly deletion: DeletionService, private readonly reports: ReportsService) {}
  @Get() list(@Req() req: AuthRequest, @Query() query: Record<string, string>) { return this.analyses.list(req.user.id, query); }
  @Post() create(@Req() req: AuthRequest, @Body() dto: AnalysisDto) { return this.analyses.create(req.user.id, dto); }
  @Get(':id') get(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.analyses.get(req.user.id, id); }
  @Post(':id/images') @UseGuards(ProcessingConsentGuard) @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 5, { limits: { fileSize: 10 * 1024 * 1024, files: 5, fields: 0 } }))
  upload(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @UploadedFiles() files: Express.Multer.File[]) { return this.analyses.upload(req.user.id, id, files); }
  @Delete(':id/images/:imageId') removeImage(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('imageId', ParseUUIDPipe) imageId: string) { return this.analyses.removeImage(req.user.id, id, imageId); }
  @Patch(':id/images/:imageId/roi') roi(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Param('imageId', ParseUUIDPipe) imageId: string, @Body() dto: RoiDto) { return this.analyses.roi(req.user.id, id, imageId, dto); }
  @Post(':id/quality-check') quality(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.analyses.quality(req.user.id, id); }
  @Put(':id/symptoms') symptoms(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SymptomsDto) { return this.analyses.symptoms(req.user.id, id, dto); }
  @Post(':id/submit') @HttpCode(202) submit(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SubmitDto) { return this.analyses.submit(req.user.id, id, dto, req.get('Idempotency-Key')); }
  @Post(':id/cancel') cancel(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.analyses.cancel(req.user.id, id); }
  @Delete(':id') @HttpCode(202) remove(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.deletion.request(req.user.id, 'ANALYSIS', id); }
  @Post(':id/report') report(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.reports.create(req.user.id, id); }
}

@ApiBearerAuth() @ApiTags('Private assets') @Controller()
export class AssetsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('assets/:id/content') async asset(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.reports.asset(req.user.id, id); res.type(file.mimeType).set('Cache-Control', 'no-store').send(file.bytes);
  }
  @Get('reports/:id/download') async report(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const file = await this.reports.asset(req.user.id, id, true); res.type('application/pdf').attachment(`dermatolog-${id}.pdf`).set('Cache-Control', 'no-store').send(file.bytes);
  }
}

@ApiBearerAuth() @ApiTags('Privacy') @Controller()
export class PrivacyController {
  constructor(private readonly db: PrismaService, private readonly analyses: AnalysesService, private readonly deletion: DeletionService) {}
  @Get('me/consents') consents(@Req() req: AuthRequest) { return this.analyses.consents(req.user.id); }
  @Post('me/consents') consent(@Req() req: AuthRequest, @Body() dto: ConsentDto) { return this.analyses.consent(req.user.id, dto); }
  @Post('me/export') async export(@Req() req: AuthRequest, @Res() response: Response) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.user.id } });
    const caseItems = await this.db.case.findMany({ where: { userId: req.user.id, deletedAt: null } });
    const cases = await Promise.all(caseItems.map(item => this.analyses.getCase(req.user.id, item.id)));
    const consents = await this.analyses.consents(req.user.id);
    await this.db.audit(req.user.id, 'DATA_EXPORTED');
    response.attachment('dermatolog-data.json').type('application/json').send(JSON.stringify({ exportedAt: new Date().toISOString(), user: publicUser(user), cases, consents }, null, 2));
  }
  @Delete('me/data') @HttpCode(202) deleteData(@Req() req: AuthRequest) { return this.deletion.request(req.user.id, 'MEDICAL_DATA'); }
  @Delete('me') @HttpCode(202) async deleteAccount(@Req() req: AuthRequest, @Body() dto: PasswordDto) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.user.id } });
    if (!await argon2.verify(user.passwordHash, dto.password)) fail(401, 'INVALID_CREDENTIALS', 'Parol noto‘g‘ri.');
    return this.deletion.request(req.user.id, 'ACCOUNT');
  }
  @Get('deletions/:id') deletionStatus(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) { return this.deletion.status(req.user.id, id); }
}
