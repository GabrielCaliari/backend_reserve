import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { RepositoryException } from '../../../../shared/exceptions';
import {
  ICustomerRepository,
  ICreateCustomer,
  ICustomer,
} from '../../domain/interfaces/customer.repository.interface';

@Injectable()
export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndEmail(tenantId: string, email: string): Promise<ICustomer | null> {
    try {
      return await this.prisma.customer.findUnique({
        where: { tenant_id_email: { tenant_id: tenantId, email } },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao buscar Customer por tenant/email.', error);
    }
  }

  async findById(id: string): Promise<ICustomer | null> {
    try {
      return await this.prisma.customer.findUnique({ where: { id } });
    } catch (error) {
      throw new RepositoryException('Erro ao buscar Customer por ID.', error);
    }
  }

  async create(data: ICreateCustomer): Promise<ICustomer> {
    try {
      return await this.prisma.customer.create({ data });
    } catch (error) {
      throw new RepositoryException('Erro ao criar Customer.', error);
    }
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<void> {
    try {
      await this.prisma.customer.update({
        where: { id },
        data: { stripe_customer_id: stripeCustomerId },
      });
    } catch (error) {
      throw new RepositoryException('Erro ao atualizar stripe_customer_id do Customer.', error);
    }
  }
}
