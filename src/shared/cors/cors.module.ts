import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CorsOriginService } from './cors-origin.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CorsOriginService],
  exports: [CorsOriginService],
})
export class CorsModule {}
