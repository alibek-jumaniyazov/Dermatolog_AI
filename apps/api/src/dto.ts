import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty() @IsString() @Length(1, 80) name!: string;
  @ApiProperty({ format: 'email' }) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ minLength: 10, maxLength: 128, format: 'password' }) @IsString() @MinLength(10) @MaxLength(128) password!: string;
}
export class LoginDto {
  @ApiProperty({ format: 'email' }) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ format: 'password' }) @IsString() @MaxLength(128) password!: string;
}
export class EmailDto { @ApiProperty({ format: 'email' }) @IsEmail() @MaxLength(254) email!: string; }
export class ResetDto {
  @ApiProperty() @IsString() @Length(32, 256) token!: string;
  @ApiProperty({ minLength: 10, format: 'password' }) @IsString() @MinLength(10) @MaxLength(128) password!: string;
}
export class ProfileDto { @ApiProperty() @IsString() @Length(1, 80) name!: string; }
export class PasswordDto { @ApiProperty({ format: 'password' }) @IsString() @MaxLength(128) password!: string; }
export class CaseDto {
  @ApiProperty() @IsString() @Length(1, 100) label!: string;
  @ApiProperty() @IsString() @Length(1, 100) bodyLocation!: string;
}
export class AnalysisDto { @ApiProperty({ format: 'uuid' }) @IsUUID() caseId!: string; }
export class ConsentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() analysisId!: string;
  @ApiProperty() @IsBoolean() processing!: boolean;
  @ApiProperty() @IsBoolean() history!: boolean;
  @ApiProperty() @IsBoolean() research!: boolean;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() externalAi?: boolean;
  @ApiProperty({ enum: ['1.0'] }) @IsIn(['1.0']) policyVersion!: string;
}
const answers = ['YES', 'NO', 'UNKNOWN'];
export class SymptomsDto {
  @ApiProperty({ enum: ['DAYS', 'WEEKS', 'MONTHS', 'YEARS', 'UNKNOWN'] }) @IsIn(['DAYS', 'WEEKS', 'MONTHS', 'YEARS', 'UNKNOWN']) duration!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) itching!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) pain!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) bleeding!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) changing!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) asymmetry!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) border!: string;
  @ApiProperty({ enum: answers }) @IsIn(answers) color!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) @IsOptional() @IsNumber() @Min(0.1) @Max(1000) diameterMm?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class RoiDto {
  @ApiPropertyOptional({ type: 'object', nullable: true, additionalProperties: false }) @IsOptional() @IsIn([null]) roi?: null;
  @ApiPropertyOptional({ minimum: 0, maximum: 1 }) @ValidateIf(o => o.roi !== null) @IsNumber() @Min(0) @Max(1) x?: number;
  @ApiPropertyOptional({ minimum: 0, maximum: 1 }) @ValidateIf(o => o.roi !== null) @IsNumber() @Min(0) @Max(1) y?: number;
  @ApiPropertyOptional({ minimum: 0.001, maximum: 1 }) @ValidateIf(o => o.roi !== null) @IsNumber() @Min(0.001) @Max(1) width?: number;
  @ApiPropertyOptional({ minimum: 0.001, maximum: 1 }) @ValidateIf(o => o.roi !== null) @IsNumber() @Min(0.001) @Max(1) height?: number;
}
export class SubmitDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() primaryImageId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() acknowledgeWarnings?: boolean;
}
