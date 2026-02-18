import { Global, Module } from '@nestjs/common';
import { JwtProvider, EncryptProvider, HashProvider } from '../providers';

/**
 * Global Auth Module
 * Provides JWT, Encrypt, and Hash providers globally
 * 
 * Note: DIP guards (AdminJwtGuard, UserJwtGuard) are NOT registered here.
 * They require ITokenValidator implementations (ADMIN_TOKEN_VALIDATOR / USER_TOKEN_VALIDATOR)
 * to be provided by bounded contexts. Register them in the BC module that provides the implementation.
 */
@Global()
@Module({
  providers: [
    JwtProvider,
    EncryptProvider,
    HashProvider,
  ],
  exports: [
    JwtProvider,
    EncryptProvider,
    HashProvider,
  ],
})
export class AuthModule {}
