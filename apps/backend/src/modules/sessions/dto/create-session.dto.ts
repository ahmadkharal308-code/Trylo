import { IsEnum } from 'class-validator';
import { Department } from '@prisma/client';

export class CreateSessionDto {
  @IsEnum(Department)
  department: Department;
}
