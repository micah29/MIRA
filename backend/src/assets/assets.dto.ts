import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CheckoutDto {
  @IsIn(['ON_LOAN', 'IN_USE', 'PROJECT']) type: 'ON_LOAN' | 'IN_USE' | 'PROJECT';
  @IsString() pic: string;
  @IsOptional() @IsEmail() picEmail?: string;
  @IsString() section: string;
  @IsOptional() @IsString() inspectionSite?: string;
  @IsOptional() @IsDateString() dueBack?: string; // required for ON_LOAN
  @IsOptional() @IsString() note?: string;
}
export class CheckinDto {
  @IsIn(['NEW', 'GOOD', 'FAIR', 'DAMAGED', 'BROKEN']) condition: 'NEW' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'BROKEN';
  @IsOptional() @IsString() note?: string;
}
export class ReserveDto { @IsString() person: string; @IsOptional() @IsString() section?: string; @IsOptional() @IsString() note?: string; }
export class NoteDto { @IsOptional() @IsString() note?: string; }
export class CreateAssetDto {
  @IsString() name: string;
  @IsString() category: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsString() storageLocation?: string;
  @IsOptional() @IsString() project?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() @Min(0) purchaseValue?: number;
  @IsOptional() @IsDateString() warrantyEnd?: string;
  @IsOptional() @IsBoolean() calRequired?: boolean;
  @IsOptional() @IsDateString() calDue?: string;
  @IsOptional() @IsInt() @Min(1) @Max(120) calIntervalMonths?: number;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}
