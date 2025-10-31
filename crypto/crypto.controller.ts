import { Controller, Post, Body } from '@nestjs/common';
import { CryptoService } from './crypto.service';

class EncryptDto {
  data: string[];
  key: string;
}

class DecryptDto {
  encryptedData: string[];
  key: string;
}

@Controller('crypto')
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('encrypt')
  async encrypt(@Body() body: EncryptDto) {
    const startTime = Date.now();
    const results = await this.cryptoService.encryptParallel(body.data, body.key);
    const duration = Date.now() - startTime;
    
    return {
      encrypted: results,
      count: results.length,
      duration: `${duration}ms`,
      threadsUsed: this.cryptoService.getWorkerCount(),
    };
  }

  @Post('decrypt')
  async decrypt(@Body() body: DecryptDto) {
    const startTime = Date.now();
    const results = await this.cryptoService.decryptParallel(
      body.encryptedData,
      body.key,
    );
    const duration = Date.now() - startTime;
    
    return {
      decrypted: results,
      count: results.length,
      duration: `${duration}ms`,
      threadsUsed: this.cryptoService.getWorkerCount(),
    };
  }
}