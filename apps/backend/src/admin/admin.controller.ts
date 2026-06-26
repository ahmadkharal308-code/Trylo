import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from './guards/basic-auth.guard';
import { buildAdminHtml } from './admin.view';

@Controller('admin')
@UseGuards(BasicAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('sellers')
  async listPending(@Res() res: Response): Promise<void> {
    try {
      const sellers = await this.adminService.getPendingSellers();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(buildAdminHtml(sellers));
    } catch {
      res.status(500).send('<p>Database error — check server logs.</p>');
    }
  }

  @Post('sellers/:id/approve')
  async approve(@Param('id') id: string, @Res() res: Response): Promise<void> {
    try {
      await this.adminService.approveSeller(id);
    } catch {
      // Redirect regardless — admin page will show current state
    }
    res.redirect('/admin/sellers');
  }

  @Post('sellers/:id/reject')
  async reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      await this.adminService.rejectSeller(id, reason ?? '');
    } catch {
      // Redirect regardless
    }
    res.redirect('/admin/sellers');
  }
}
