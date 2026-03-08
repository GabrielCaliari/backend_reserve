import CPF from '../../../../shared/domain/value-objects/cpf.vo';
import Email from '../../../../shared/domain/value-objects/email.vo';
import PhoneNumber from '../../../../shared/domain/value-objects/phone-number.vo';

export default class User {
  public id?: string;
  public email: Email;
  public name: string;
  public cpf: CPF;
  public phone_number: PhoneNumber;
  public sex: number;
  public date_of_birth: Date;
  public date_expires_in: Date;
  public plan_id: string;
  public created_at?: Date;
  public updated_at?: Date;

  constructor(user: User) {
    this.id = user.id ?? null;
    this.email = user.email;
    this.name = user.name;
    this.cpf = user.cpf;
    this.phone_number = user.phone_number;
    this.sex = user.sex;
    this.date_of_birth = user.date_of_birth;
    this.date_expires_in = user.date_expires_in;
    this.plan_id = user.plan_id;
    this.created_at = user.created_at ?? null;
    this.updated_at = user.updated_at ?? null;
  }
}
