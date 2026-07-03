import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CandidateService } from './candidate.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { AdminAuthGuard } from '../../auth/guards/admin-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('admin')
@UseGuards(AdminAuthGuard)
export class CandidateController {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Post('positions/:positionId/candidates')
  @UseInterceptors(FileInterceptor('photo'))
  async create(
    @Param('positionId') positionId: string,
    @Body() createCandidateDto: CreateCandidateDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB limit
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
        fileIsRequired: false,
      }),
    ) file?: Express.Multer.File,
  ) {
    let photoUrl: string | undefined = undefined;
    if (file) {
      photoUrl = await this.supabaseService.uploadCandidatePhoto(file);
    }
    return this.candidateService.create(positionId, createCandidateDto, photoUrl);
  }

  @Get('candidates/:id')
  findOne(@Param('id') id: string) {
    return this.candidateService.findOne(id);
  }

  @Patch('candidates/:id')
  @UseInterceptors(FileInterceptor('photo'))
  async update(
    @Param('id') id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
        ],
        fileIsRequired: false,
      }),
    ) file?: Express.Multer.File,
  ) {
    let photoUrl: string | undefined = undefined;
    if (file) {
      photoUrl = await this.supabaseService.uploadCandidatePhoto(file);
    }
    return this.candidateService.update(id, updateCandidateDto, photoUrl);
  }

  @Delete('candidates/:id')
  remove(@Param('id') id: string) {
    return this.candidateService.remove(id);
  }
}
