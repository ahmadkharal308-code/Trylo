import { Controller, Get, Query } from '@nestjs/common';
import { Department } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';

class TaxonomyQueryDto {
  @IsOptional()
  @IsEnum(Department)
  department?: Department;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Typo-tolerant product search.
   * GET /search?q=abaya&department=WOMEN
   * GET /search?q=abbaya          ← typo; still returns abayas + correctedQuery field
   *
   * Response includes:
   *   correctedQuery: "Abaya"     ← shown to buyer as "Did you mean Abaya?"
   *   taxonomy: { rootCategory, subStyle }  ← which category the query resolved to
   *   items: [...]                ← LIVE products, seller info always included
   */
  @Get()
  search(@Query() dto: SearchDto) {
    return this.searchService.search(dto);
  }

  /**
   * Full taxonomy tree — used by the frontend to populate category menus.
   * GET /search/taxonomy
   * GET /search/taxonomy?department=WOMEN
   */
  @Get('taxonomy')
  taxonomy(@Query() dto: TaxonomyQueryDto) {
    return this.searchService.getTaxonomy(dto.department);
  }
}
