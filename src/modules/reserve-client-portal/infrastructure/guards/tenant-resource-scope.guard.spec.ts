import 'reflect-metadata';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ScopedToTenantResource,
  TENANT_RESOURCE_SCOPE_KEY,
  TenantResourceRef,
  TenantResourceScopeGuard,
} from './tenant-resource-scope.guard';

type RequestShape = {
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
  tenant_id?: string;
  admin_role?: string;
};

function contextFor(request: RequestShape): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

function reflectorReturning(refs: TenantResourceRef[] | undefined): Reflector {
  return { getAllAndOverride: () => refs } as unknown as Reflector;
}

/** So os delegates que o guard realmente usa; cada um devolve o que o teste armar. */
function prismaStub(overrides: Record<string, unknown>) {
  const notCalled = () => {
    throw new Error('unexpected prisma call');
  };
  return {
    hotelClient: { findUnique: notCalled },
    hotelGuest: { findUnique: notCalled },
    monthlyReport: { findUnique: notCalled },
    whatsAppTrackingLink: { findUnique: notCalled },
    digestReport: { findUnique: notCalled },
    ...overrides,
  } as any;
}

const CLIENT_REF: TenantResourceRef[] = [{ kind: 'hotelClient', key: 'clientId' }];

describe('TenantResourceScopeGuard', () => {
  it('libera rota sem @ScopedToTenantResource sem tocar no banco', async () => {
    const guard = new TenantResourceScopeGuard(reflectorReturning(undefined), prismaStub({}));

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', params: { clientId: 'c1' } })),
    ).resolves.toBe(true);
  });

  it('recusa recurso de outro tenant', async () => {
    const guard = new TenantResourceScopeGuard(
      reflectorReturning(CLIENT_REF),
      prismaStub({
        hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant-b' }) },
      }),
    );

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', params: { clientId: 'c1' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('libera recurso do proprio tenant', async () => {
    const guard = new TenantResourceScopeGuard(
      reflectorReturning(CLIENT_REF),
      prismaStub({
        hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant-a' }) },
      }),
    );

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', params: { clientId: 'c1' } })),
    ).resolves.toBe(true);
  });

  // Cross-tenant por definicao: na tela "Portal de Clientes" o super admin abre
  // um cliente da listagem global, que quase nunca e o tenant selecionado.
  it('deixa o super_admin passar sem consultar o dono do recurso', async () => {
    const findUnique = jest.fn();
    const guard = new TenantResourceScopeGuard(
      reflectorReturning(CLIENT_REF),
      prismaStub({ hotelClient: { findUnique } }),
    );

    await expect(
      guard.canActivate(
        contextFor({ admin_role: 'super_admin', tenant_id: 'tenant-a', params: { clientId: 'c1' } }),
      ),
    ).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  // HotelClient.tenant_id e nullable (FK ON DELETE SET NULL): orfao nao pertence
  // a tenant nenhum, entao nenhum admin comum o alcanca.
  it('recusa HotelClient orfao (tenant_id nulo) para admin comum', async () => {
    const guard = new TenantResourceScopeGuard(
      reflectorReturning(CLIENT_REF),
      prismaStub({
        hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: null }) },
      }),
    );

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', params: { clientId: 'c1' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deixa o super_admin alcancar HotelClient orfao', async () => {
    const guard = new TenantResourceScopeGuard(
      reflectorReturning(CLIENT_REF),
      prismaStub({
        hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: null }) },
      }),
    );

    await expect(
      guard.canActivate(
        contextFor({ admin_role: 'super_admin', tenant_id: 'tenant-a', params: { clientId: 'c1' } }),
      ),
    ).resolves.toBe(true);
  });

  it('404 quando o recurso nao existe', async () => {
    const guard = new TenantResourceScopeGuard(
      reflectorReturning(CLIENT_REF),
      prismaStub({ hotelClient: { findUnique: jest.fn().mockResolvedValue(null) } }),
    );

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', params: { clientId: 'nope' } })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  // E o que permite um unico decorator de classe cobrir rotas heterogeneas
  // (`:clientId` numas, `guest/:guestId` noutras).
  it('ignora referencia cuja chave nao esta na rota', async () => {
    const guestFindUnique = jest.fn();
    const guard = new TenantResourceScopeGuard(
      reflectorReturning([
        { kind: 'hotelClient', key: 'clientId' },
        { kind: 'hotelGuest', key: 'guestId' },
      ]),
      prismaStub({
        hotelClient: { findUnique: jest.fn().mockResolvedValue({ tenant_id: 'tenant-a' }) },
        hotelGuest: { findUnique: guestFindUnique },
      }),
    );

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', params: { clientId: 'c1' } })),
    ).resolves.toBe(true);
    expect(guestFindUnique).not.toHaveBeenCalled();
  });

  it('resolve o tenant dono via HotelClient para hospede, relatorio e link', async () => {
    const cases: Array<[TenantResourceRef, Record<string, unknown>, RequestShape]> = [
      [
        { kind: 'hotelGuest', key: 'guestId' },
        { hotelGuest: { findUnique: async () => ({ HotelClient: { tenant_id: 'tenant-b' } }) } },
        { tenant_id: 'tenant-a', params: { guestId: 'g1' } },
      ],
      [
        { kind: 'monthlyReport', key: 'id' },
        { monthlyReport: { findUnique: async () => ({ HotelClient: { tenant_id: 'tenant-b' } }) } },
        { tenant_id: 'tenant-a', params: { id: 'r1' } },
      ],
      [
        { kind: 'whatsAppTrackingLink', key: 'linkId' },
        {
          whatsAppTrackingLink: {
            findUnique: async () => ({ HotelClient: { tenant_id: 'tenant-b' } }),
          },
        },
        { tenant_id: 'tenant-a', params: { linkId: 'l1' } },
      ],
      [
        { kind: 'digestReport', key: 'id' },
        { digestReport: { findUnique: async () => ({ tenant_id: 'tenant-b' }) } },
        { tenant_id: 'tenant-a', params: { id: 'd1' } },
      ],
    ];

    for (const [ref, delegates, request] of cases) {
      const guard = new TenantResourceScopeGuard(
        reflectorReturning([ref]),
        prismaStub(delegates),
      );
      await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  // O `tenant_id` do corpo do POST de criacao nao passa por rota nenhuma: sem
  // esta forma um admin criaria recurso dentro de outro tenant.
  it('valida chave vinda do corpo (source: body) sem consultar o banco', async () => {
    const guard = new TenantResourceScopeGuard(
      reflectorReturning([{ kind: 'tenant', key: 'tenant_id', source: 'body' }]),
      prismaStub({}),
    );

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', body: { tenant_id: 'tenant-b' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      guard.canActivate(contextFor({ tenant_id: 'tenant-a', body: { tenant_id: 'tenant-a' } })),
    ).resolves.toBe(true);
  });

  // Fail-closed: se alguem inverter a ordem dos guards o pedido quebra em vez de
  // passar sem checagem de posse.
  it('lanca quando roda antes do TenantGuard (sem request.tenant_id)', async () => {
    const guard = new TenantResourceScopeGuard(reflectorReturning(CLIENT_REF), prismaStub({}));

    await expect(guard.canActivate(contextFor({ params: { clientId: 'c1' } }))).rejects.toThrow(
      /must run after TenantGuard/,
    );
  });

  it('@ScopedToTenantResource grava as referencias sob a chave lida pelo guard', () => {
    class Sample {}
    ScopedToTenantResource({ kind: 'hotelClient', key: 'clientId' })(Sample);

    expect(Reflect.getMetadata(TENANT_RESOURCE_SCOPE_KEY, Sample)).toEqual([
      { kind: 'hotelClient', key: 'clientId' },
    ]);
  });
});
