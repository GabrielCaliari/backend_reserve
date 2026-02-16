import { DomainException } from '@/shared/exceptions';
import { isValidCPF } from '@/shared/helpers/cpf.helper';

export default class CPF {
  private readonly cpf: string;

  constructor(cpf: string) {
    if (!isValidCPF(cpf)) {
      throw new DomainException('CPF invalido', 'INVALID_CPF', { invalid_value: cpf });
    }
    this.cpf = cpf;
  }

  public toString(): string {
    return this.cpf;
  }
}
