import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  ICreateUserCollection,
  IUpdateUserCollection,
  IUserCollectionRepository,
} from '../../domain/interfaces/user-collection.repository.interface';

@Injectable()
export class UserCollectionRepository implements IUserCollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: ICreateUserCollection) {
    return this.prisma.userCollection.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        tenant_id: data.tenant_id,
        active: data.active ?? true,
      },
    });
  }

  findById(id: string, tenantId?: string) {
    return this.prisma.userCollection.findFirst({
      where: {
        id,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
    });
  }

  findBySlugAndTenantId(slug: string, tenantId: string) {
    return this.prisma.userCollection.findFirst({
      where: { slug, tenant_id: tenantId },
    });
  }

  findAllByTenantId(tenantId: string) {
    return this.prisma.userCollection.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
    });
  }

  findAllByUserId(userId: string, tenantId?: string) {
    return this.prisma.userCollection.findMany({
      where: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        Memberships: {
          some: {
            user_id: userId,
            active: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  update(id: string, data: IUpdateUserCollection) {
    return this.prisma.userCollection.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  deactivate(id: string) {
    return this.prisma.userCollection.update({
      where: { id },
      data: { active: false },
    });
  }
}