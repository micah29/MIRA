import { IsDateString, IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateRequestDto {
  @IsIn(['ON_LOAN', 'IN_USE', 'PROJECT']) type: 'ON_LOAN' | 'IN_USE' | 'PROJECT';
  @IsOptional() @IsString() section?: string;
  @IsOptional() @IsString() inspectionSite?: string;
  @IsOptional() @IsDateString() dueBack?: string;
  @IsOptional() @IsString() note?: string;
}
export class RejectDto {
  @IsOptional() @IsString() reason?: string;
}
