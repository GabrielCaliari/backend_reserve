import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SecurityPostureGuard } from './security-posture.guard';
import { Public } from '../decorators/public.decorator';

class AlwaysAllowGuard {
  canActivate() {
    return true;
  }
}

@Controller('posture')
class PostureController {
  @Get('bare')
  bare() {
    return { ok: true };
  }

  @Get('public')
  @Public()
  publicRoute() {
    return { ok: true };
  }

  @Get('guarded')
  @UseGuards(AlwaysAllowGuard)
  guarded() {
    return { ok: true };
  }
}

@Public()
@Controller('posture-public-class')
class PublicClassController {
  @Get()
  ok() {
    return { ok: true };
  }
}

@UseGuards(AlwaysAllowGuard)
@Controller('posture-guarded-class')
class GuardedClassController {
  @Get()
  ok() {
    return { ok: true };
  }
}

describe('SecurityPostureGuard (deny-by-default)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PostureController, PublicClassController, GuardedClassController],
      providers: [{ provide: APP_GUARD, useClass: SecurityPostureGuard }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('403s a route with neither guards nor @Public', async () => {
    await request(app.getHttpServer()).get('/posture/bare').expect(403);
  });

  it('allows an @Public handler', async () => {
    await request(app.getHttpServer()).get('/posture/public').expect(200);
  });

  it('allows a handler with its own @UseGuards', async () => {
    await request(app.getHttpServer()).get('/posture/guarded').expect(200);
  });

  it('allows @Public at class level', async () => {
    await request(app.getHttpServer()).get('/posture-public-class').expect(200);
  });

  it('allows @UseGuards at class level', async () => {
    await request(app.getHttpServer()).get('/posture-guarded-class').expect(200);
  });

  it('allows an unclassified route through (log-only) when SECURITY_POSTURE_ENFORCE=false', async () => {
    const original = process.env.SECURITY_POSTURE_ENFORCE;
    process.env.SECURITY_POSTURE_ENFORCE = 'false';

    try {
      await request(app.getHttpServer()).get('/posture/bare').expect(200);
    } finally {
      if (original === undefined) delete process.env.SECURITY_POSTURE_ENFORCE;
      else process.env.SECURITY_POSTURE_ENFORCE = original;
    }
  });

  it('still 403s an unclassified route when SECURITY_POSTURE_ENFORCE is unset (default enforced)', async () => {
    delete process.env.SECURITY_POSTURE_ENFORCE;
    await request(app.getHttpServer()).get('/posture/bare').expect(403);
  });
});
