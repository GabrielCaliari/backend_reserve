import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { EUserCollectionRole } from '../../domain/enums/user-collection-role.enum';
import {
  IAssignUserCollectionMembership,
  IUserCollectionMembershipRepository,
} from '../../domain/interfaces/user-collection-membership.repository.interface';

@Injectable()
export class UserCollectionMembershipRepository implements IUserCollectionMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomainRole(role: string | null | undefined): EUserCollectionRole | null {
    if (!role) {
      return null;
    }

    switch (role) {
      case EUserCollectionRole.guest:
        return EUserCollectionRole.guest;
      case EUserCollectionRole.member:
        return EUserCollectionRole.member;
      case EUserCollectionRole.operator:
        return EUserCollectionRole.operator;
      default:
        return null;
    }
  }

  async assign(data: IAssignUserCollectionMembership) {
    const existing = await this.prisma.userCollectionMembership.findFirst({
      where: {
        user_id: data.user_id,
        collection_id: data.collection_id,
      },
    });

    if (existing) {
      return this.prisma.userCollectionMembership.update({
        where: { id: existing.id },
        data: {
          role: data.role ?? existing.role,
          active: true,
        },
      });
    }

    return this.prisma.userCollectionMembership.create({
      data: {
        user_id: data.user_id,
        collection_id: data.collection_id,
        role: data.role ?? EUserCollectionRole.member,
      },
    });
  }

  async remove(userId: string, collectionId: string): Promise<void> {
    const membership = await this.prisma.userCollectionMembership.findFirst({
      where: { user_id: userId, collection_id: collectionId },
    });

    if (!membership) {
      return;
    }

    await this.prisma.userCollectionMembership.update({
      where: { id: membership.id },
      data: { active: false },
    });
  }

  updateRole(userId: string, collectionId: string, role: EUserCollectionRole) {
    return this.prisma.userCollectionMembership.update({
      where: {
        user_id_collection_id: {
          user_id: userId,
          collection_id: collectionId,
        },
      },
      data: { role },
    });
  }

  findMembership(userId: string, collectionId: string, tenantId?: string) {
    return this.prisma.userCollectionMembership.findFirst({
      where: {
        user_id: userId,
        collection_id: collectionId,
        active: true,
        Collection: {
          ...(tenantId ? { tenant_id: tenantId } : {}),
          active: true,
        },
      },
      include: {
        Collection: true,
      },
    });
  }

  findCollectionsByUserId(userId: string, tenantId?: string) {
    return this.prisma.userCollectionMembership.findMany({
      where: {
        user_id: userId,
        active: true,
        Collection: {
          ...(tenantId ? { tenant_id: tenantId } : {}),
          active: true,
        },
      },
      include: {
        Collection: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  findUsersByCollectionId(collectionId: string) {
    return this.prisma.userCollectionMembership.findMany({
      where: {
        collection_id: collectionId,
        active: true,
      },
      include: {
        User: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async hasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.userCollectionMembership.count({
      where: {
        user_id: userId,
        active: true,
        Collection: {
          tenant_id: tenantId,
          active: true,
        },
      },
    });

    return count > 0;
  }

  async findRoleInCollection(userId: string, collectionId: string, tenantId?: string): Promise<EUserCollectionRole | null> {
    const membership = await this.findMembership(userId, collectionId, tenantId);
    return this.toDomainRole(membership?.role);
  }
}