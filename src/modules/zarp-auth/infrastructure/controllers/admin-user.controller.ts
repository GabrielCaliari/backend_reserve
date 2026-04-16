import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AdminJwtGuard } from '../../../../shared/auth/guards/admin-jwt.guard';
import { RolesGuard } from '../../../../shared/auth/guards/roles.guard';
import { Roles } from '../../../../shared/auth/decorators/roles.decorator';
import { ParseCuidPipe } from '../../../../shared/pipes';
import { EAdminRole } from '../../domain/enums/admin-role.enum';
import { UserManagementService } from '../../application/services/user-management.service';
import { 
  UpdateUserDTO, 
  UserResponseDTO, 
  UserListResponseDTO 
} from '../../application/dtos/user-management.dto';

@ApiTags('Admin - User Management')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @Roles(EAdminRole.super_admin, EAdminRole.manager)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'List all users with pagination',
    description: 'Returns a paginated list of all users in the system'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Users listed', type: UserListResponseDTO })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Res() res: Response,
  ) {
    const result = await this.userManagementService.findAll(
      parseInt(page),
      parseInt(limit),
    );
    return res.status(result.status).json(result.data);
  }

  @Get('/:id')
  @Roles(EAdminRole.super_admin, EAdminRole.manager)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Get user by CUID',
    description: 'Returns detailed information about a specific user'
  })
  @ApiParam({ name: 'id', type: String, description: 'User CUID (25-character identifier)', example: 'cma1bcdef0001ghijklmno23p' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDTO })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.userManagementService.findById(id);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:id')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Update user data by CUID (super_admin only)',
    description: 'Updates user name, email, or phone number'
  })
  @ApiParam({ name: 'id', type: String, description: 'User CUID (25-character identifier)', example: 'cma1bcdef0001ghijklmno23p' })
  @ApiBody({ type: UpdateUserDTO })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated',
    schema: {
      example: {
        id: 'cma1bcdef0001ghijklmno23p',
        name: 'Jane Doe Updated',
        email: 'jane.new@example.com',
        phone_number: '5511999999999'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() data: UpdateUserDTO,
    @Res() res: Response,
  ) {
    const result = await this.userManagementService.update(id, data);
    return res.status(result.status).json(result.data);
  }

  @Patch('/:id/deactivate')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Deactivate user by CUID (super_admin only)',
    description: 'Deactivates a user account by setting expiration date to now'
  })
  @ApiParam({ name: 'id', type: String, description: 'User CUID (25-character identifier)', example: 'cma1bcdef0001ghijklmno23p' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deactivated',
    schema: {
      example: {
        id: 'cma1bcdef0001ghijklmno23p',
        date_expires_in: '2024-01-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deactivate(
    @Param('id', ParseCuidPipe) id: string,
    @Res() res: Response,
  ) {
    const result = await this.userManagementService.deactivate(id);
    return res.status(result.status).json(result.data);
  }

  @Delete('/:id')
  @Roles(EAdminRole.super_admin)
  @UseGuards(AdminJwtGuard, RolesGuard)
  @ApiOperation({ 
    summary: 'Delete user permanently by CUID (super_admin only)',
    description: 'Permanently deletes a user account and all associated data'
  })
  @ApiParam({ name: 'id', type: String, description: 'User CUID (25-character identifier)', example: 'cma1bcdef0001ghijklmno23p' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted',
    schema: {
      example: {
        deleted: true
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id', ParseCuidPipe) id: string, @Res() res: Response) {
    const result = await this.userManagementService.delete(id);
    return res.status(result.status).json(result.data);
  }
}