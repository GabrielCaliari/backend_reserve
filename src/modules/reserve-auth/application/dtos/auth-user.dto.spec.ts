import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import AuthUserDTO from './auth-user.dto';
import { CalculateCostBodyDTO } from '../../../reserve-b2c-products/infrastructure/controllers/products.controller';
import { AssignAuthorAvatarDTO } from '../../../reserve-cms/application/dtos/author-response.dto';

/**
 * Regressão do Critical #2: DTOs sem nenhum decorator do class-validator
 * eram esvaziados para `{}` pelo `whitelist: true` do ValidationPipe global
 * (main.ts). AuthUserDTO era o caso mais grave — quebrava todo o login B2C.
 */
describe('AuthUserDTO', () => {
  it('não retorna erros de validação para um payload válido', async () => {
    const dto = plainToInstance(AuthUserDTO, { email: 'a@b.com', password: 'x' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('mantém email e password após whitelist-transform (não esvazia para {})', () => {
    const dto = plainToInstance(
      AuthUserDTO,
      { email: 'a@b.com', password: 'x' },
      { excludeExtraneousValues: false },
    );
    expect(dto.email).toBe('a@b.com');
    expect(dto.password).toBe('x');
    expect(Object.keys(dto)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('rejeita email inválido', async () => {
    const dto = plainToInstance(AuthUserDTO, { email: 'not-an-email', password: 'x' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejeita payload sem password', async () => {
    const dto = plainToInstance(AuthUserDTO, { email: 'a@b.com' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('CalculateCostBodyDTO', () => {
  it('não retorna erros de validação quando priceId está ausente (campo opcional)', async () => {
    const dto = plainToInstance(CalculateCostBodyDTO, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('não retorna erros de validação para um priceId string válido', async () => {
    const dto = plainToInstance(CalculateCostBodyDTO, { priceId: 'price_123' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.priceId).toBe('price_123');
  });
});

describe('AssignAuthorAvatarDTO', () => {
  it('não retorna erros de validação para um avatarId válido', async () => {
    const dto = plainToInstance(AssignAuthorAvatarDTO, { avatarId: 'cmcmsasset01abc234def56789' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.avatarId).toBe('cmcmsasset01abc234def56789');
  });

  it('rejeita payload sem avatarId', async () => {
    const dto = plainToInstance(AssignAuthorAvatarDTO, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
