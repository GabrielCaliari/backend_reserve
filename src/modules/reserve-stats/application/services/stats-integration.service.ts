import {
  Injectable,
  Inject,
  Optional,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  IStatsIntegrationRepository,
  STATS_INTEGRATION_REPOSITORY,
  IStatsIntegration,
} from '../../domain/interfaces/stats-integration.repository.interface';
import {
  IExternalMetricProvider,
  EXTERNAL_METRIC_PROVIDERS,
} from '../../domain/interfaces/external-metric-provider.interface';
import {
  CreateStatsIntegrationDto,
  UpdateStatsIntegrationDto,
  StatsIntegrationResponseDto,
  AvailableIntegrationDto,
} from '../dtos/stats-integration.dto';

@Injectable()
export class StatsIntegrationService {
  constructor(
    @Inject(STATS_INTEGRATION_REPOSITORY)
    private readonly repository: IStatsIntegrationRepository,

    @Optional()
    @Inject(EXTERNAL_METRIC_PROVIDERS)
    private readonly externalProviders: IExternalMetricProvider[],
  ) {
    this.externalProviders = externalProviders ?? [];
  }

  async listByTenant(tenantId: string): Promise<StatsIntegrationResponseDto[]> {
    const integrations = await this.repository.findByTenant(tenantId);
    return integrations.map((i) => this.maskSecrets(i));
  }

  async getById(id: string, tenantId: string): Promise<StatsIntegrationResponseDto> {
    const integration = await this.repository.findById(id);
    if (!integration || integration.tenant_id !== tenantId) {
      throw new NotFoundException(`Stats integration #${id} not found`);
    }
    return this.maskSecrets(integration);
  }

  async create(
    tenantId: string,
    dto: CreateStatsIntegrationDto,
  ): Promise<StatsIntegrationResponseDto> {
    const provider = this.externalProviders.find((p) => p.integrationKey === dto.key);
    if (!provider) {
      throw new BadRequestException(
        `No provider registered for key "${dto.key}". Available: ${this.externalProviders.map((p) => p.integrationKey).join(', ')}`,
      );
    }

    if (!provider.validateConfig(dto.config)) {
      throw new BadRequestException(
        `Invalid configuration for provider "${dto.key}". Check the required config fields.`,
      );
    }

    const existing = await this.repository.findByTenantAndKey(tenantId, dto.key);
    if (existing) {
      throw new ConflictException(
        `Integration "${dto.key}" already exists for this tenant. Use PATCH to update it.`,
      );
    }

    const created = await this.repository.create({
      tenant_id: tenantId,
      key: dto.key,
      label: dto.label,
      config: dto.config,
      active: true,
    });

    return this.maskSecrets(created);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateStatsIntegrationDto,
  ): Promise<StatsIntegrationResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new NotFoundException(`Stats integration #${id} not found`);
    }

    if (dto.config) {
      const provider = this.externalProviders.find(
        (p) => p.integrationKey === existing.key,
      );
      if (provider && !provider.validateConfig(dto.config)) {
        throw new BadRequestException(
          `Invalid configuration for provider "${existing.key}".`,
        );
      }
    }

    const updated = await this.repository.update(id, dto);
    return this.maskSecrets(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing || existing.tenant_id !== tenantId) {
      throw new NotFoundException(`Stats integration #${id} not found`);
    }
    await this.repository.delete(id);
  }

  getAvailableProviders(): AvailableIntegrationDto[] {
    return this.externalProviders.map((p) => ({
      key: p.integrationKey,
      label: p.label,
      description: p.description,
      configSchema: p.configSchema,
    }));
  }

  /**
   * Returns the integration config with secret fields masked (***).
   * The raw config is never sent to the client.
   */
  private maskSecrets(integration: IStatsIntegration): StatsIntegrationResponseDto {
    const provider = this.externalProviders.find(
      (p) => p.integrationKey === integration.key,
    );

    const maskedConfig: Record<string, any> = { ...integration.config };

    if (provider) {
      for (const [field, schema] of Object.entries(provider.configSchema)) {
        if (schema.secret && maskedConfig[field]) {
          maskedConfig[field] = '***';
        }
      }
    }

    return {
      id: integration.id,
      tenant_id: integration.tenant_id,
      key: integration.key,
      label: integration.label,
      config: maskedConfig,
      active: integration.active,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
    };
  }
}
