import { Inject, Injectable } from '@nestjs/common';
import { errorResponse, successResponse } from '../../../../shared/helpers';
import { IUserRepository, USER_REPOSITORY } from '../../domain/interfaces/user.repository.interface';

@Injectable()
export class UserManagementService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  async findAll(page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;
      const users = await this.userRepository.findAllPaginated(skip, limit);
      const total = await this.userRepository.count();

      return successResponse({
        users: users.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number,
          cpf: user.cpf,
          plan_id: user.plan_id,
          created_at: user.created_at,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return errorResponse('500:USERS_NOT_LISTED', 500, error);
    }
  }

  async findById(id: string) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return errorResponse('404:USER_NOT_FOUND', 404);
      }

      return successResponse({
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        cpf: user.cpf,
        sex: user.sex,
        date_of_birth: user.date_of_birth,
        date_expires_in: user.date_expires_in,
        plan_id: user.plan_id,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });
    } catch (error) {
      return errorResponse('500:USER_NOT_FOUND', 500, error);
    }
  }

  async update(id: string, data: { name?: string; email?: string; phone_number?: string }) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return errorResponse('404:USER_NOT_FOUND', 404);
      }

      if (data.email && data.email !== user.email) {
        const existing = await this.userRepository.findByEmail(data.email);
        if (existing) {
          return errorResponse('400:USER_EMAIL_ALREADY_EXISTS', 400);
        }
      }

      const updated = await this.userRepository.update(id, data);
      return successResponse({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone_number: updated.phone_number,
      });
    } catch (error) {
      return errorResponse('500:USER_NOT_UPDATED', 500, error);
    }
  }

  async deactivate(id: string) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return errorResponse('404:USER_NOT_FOUND', 404);
      }

      // Set expiration date to now to deactivate
      const deactivated = await this.userRepository.update(id, {
        date_expires_in: new Date(),
      });

      return successResponse({
        id: deactivated.id,
        date_expires_in: deactivated.date_expires_in,
      });
    } catch (error) {
      return errorResponse('500:USER_NOT_DEACTIVATED', 500, error);
    }
  }

  async delete(id: string) {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        return errorResponse('404:USER_NOT_FOUND', 404);
      }

      await this.userRepository.delete(id);
      return successResponse({ deleted: true });
    } catch (error) {
      return errorResponse('500:USER_NOT_DELETED', 500, error);
    }
  }
}
