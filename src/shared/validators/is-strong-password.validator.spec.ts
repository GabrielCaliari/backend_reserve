import { validate } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

class Dto {
  @IsStrongPassword()
  password: string;
}

async function isValidPassword(password: string): Promise<boolean> {
  const dto = new Dto();
  dto.password = password;
  const errors = await validate(dto);
  return errors.length === 0;
}

describe('IsStrongPassword', () => {
  it('rejeita senha com menos de 10 caracteres', async () => {
    expect(await isValidPassword('Ab1!Ab1!')).toBe(false); // 8 caracteres
  });

  it('rejeita senha sem letra maiúscula', async () => {
    expect(await isValidPassword('abcdefgh1!')).toBe(false);
  });

  it('rejeita senha sem letra minúscula', async () => {
    expect(await isValidPassword('ABCDEFGH1!')).toBe(false);
  });

  it('rejeita senha sem dígito', async () => {
    expect(await isValidPassword('Abcdefgh!!')).toBe(false);
  });

  it('rejeita senha sem símbolo', async () => {
    expect(await isValidPassword('Abcdefgh12')).toBe(false);
  });

  it('aceita senha que cumpre os quatro requisitos com exatamente 10 caracteres', async () => {
    expect(await isValidPassword('Str0ng!Pas')).toBe(true);
  });

  it('aceita senha longa e claramente forte', async () => {
    expect(await isValidPassword('C0rrect!HorseBattery')).toBe(true);
  });

  it('rejeita valor que não é string', async () => {
    const dto = new Dto();
    (dto as unknown as { password: number }).password = 12345678901;
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('devolve uma mensagem em português dizendo o que falta', async () => {
    const dto = new Dto();
    dto.password = 'fraca';
    const errors = await validate(dto);
    const message = Object.values(errors[0].constraints ?? {}).join(' ');
    expect(message).toContain('10 caracteres');
  });
});
