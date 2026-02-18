import { Injectable } from '@nestjs/common';
import { ProviderException } from '../exceptions';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  [key: string]: any;
}

export interface JwtValidationResult {
  jwt: string;
  expired?: boolean;
  payload?: JwtPayload;
}

@Injectable()
export class JwtProvider {
  private readonly privateKey: string;
  private readonly algorithm: jwt.Algorithm;

  constructor() {
    this.privateKey = process.env.JWT_PRIVATE_KEY;
    this.algorithm = (process.env.JWT_ALGORITHM || 'HS256') as jwt.Algorithm;

    if (!this.privateKey) {
      throw new ProviderException('JWT: private key not found in environment');
    }
  }

  async generate(payload: JwtPayload, expiresIn: number | string, salt?: string): Promise<string> {
    try {
      const seed = salt ? this.privateKey + salt : this.privateKey;
      
      const token = jwt.sign(payload, seed, {
        algorithm: this.algorithm,
        expiresIn,
      });

      return token;
    } catch (error) {
      throw new ProviderException('JWT: error generating token', 'JWT_GENERATION_ERROR', error);
    }
  }

  async validate(token: string, salt?: string): Promise<JwtValidationResult> {
    try {
      const seed = salt ? this.privateKey + salt : this.privateKey;
      const decoded = jwt.verify(token, seed) as JwtPayload;

      return {
        jwt: token,
        payload: decoded,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        return {
          jwt: token,
          expired: true,
        };
      }

      throw new ProviderException('JWT: error validating token', 'JWT_VALIDATION_ERROR', error);
    }
  }

  async decode(token: string): Promise<JwtPayload | null> {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      throw new ProviderException('JWT: error decoding token', 'JWT_DECODE_ERROR', error);
    }
  }
}
