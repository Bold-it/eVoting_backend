import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SupabaseService {
  constructor() {}

  async uploadCandidatePhoto(file: Express.Multer.File): Promise<string> {
    const fileExtension = file.originalname.split('.').pop() || 'png';
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'candidates');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    
    return `http://localhost:3000/uploads/candidates/${fileName}`;
  }
}
