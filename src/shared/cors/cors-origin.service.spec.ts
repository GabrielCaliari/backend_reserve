import { CorsOriginService } from './cors-origin.service';

describe('CorsOriginService', () => {
  const ORIGINAL_ENV = process.env.CORS_ORIGINS;
  let findMany: jest.Mock;
  let prisma: any;

  const makeService = () => new CorsOriginService(prisma);

  beforeEach(() => {
    process.env.CORS_ORIGINS = 'https://admin.reserve.com, https://reserve.com/';
    findMany = jest.fn().mockResolvedValue([]);
    prisma = { tenantDomain: { findMany } };
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = ORIGINAL_ENV;
  });

  it('allows an env origin without querying the database', async () => {
    const service = makeService();
    await expect(service.isAllowed('https://admin.reserve.com')).resolves.toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('normalizes trailing slashes in env origins and in the incoming origin', async () => {
    const service = makeService();
    await expect(service.isAllowed('https://reserve.com/')).resolves.toBe(true);
  });

  it('allows the bare registered domain', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
  });

  it('allows a subdomain of a registered domain automatically', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://app.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://portal.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://a.b.hotelacme.com')).resolves.toBe(true);
  });

  it('rejects a sibling domain that only shares a suffix', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://outrohotelacme.com')).resolves.toBe(false);
    await expect(service.isAllowed('https://nothotelacme.com')).resolves.toBe(false);
  });

  it('rejects http origins for scoped domains', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('http://hotelacme.com')).resolves.toBe(false);
  });

  it('normalizes a domain value stored with a scheme prefix', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'https://portal.other.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://portal.other.com')).resolves.toBe(true);
  });

  it('blocks an unknown origin', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await expect(service.isAllowed('https://evil.example')).resolves.toBe(false);
  });

  it('matches a stored regex pattern literally', async () => {
    findMany.mockResolvedValue([
      { type: 'regex', value: '^https://(preview-\\d+\\.)?staging\\.hotelacme\\.com$' },
    ]);
    const service = makeService();
    await expect(service.isAllowed('https://preview-42.staging.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://staging.hotelacme.com')).resolves.toBe(true);
    await expect(service.isAllowed('https://random.com')).resolves.toBe(false);
  });

  it('skips a malformed stored regex without throwing', async () => {
    findMany.mockResolvedValue([
      { type: 'regex', value: '(unterminated' },
      { type: 'domain', value: 'hotelacme.com' },
    ]);
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
  });

  it('ignores blank stored values', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: '' }, { type: 'domain', value: '   ' }]);
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(false);
  });

  it('only queries active domains of active tenants', async () => {
    const service = makeService();
    await service.isAllowed('https://hotelacme.com');
    expect(findMany).toHaveBeenCalledWith({
      where: { active: true, Tenant: { active: true } },
      select: { type: true, value: true },
    });
  });

  it('caches tenant domains between calls', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await service.isAllowed('https://hotelacme.com');
    await service.isAllowed('https://app.hotelacme.com');
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('invalidate() forces a re-query on the next check', async () => {
    findMany.mockResolvedValue([{ type: 'domain', value: 'hotelacme.com' }]);
    const service = makeService();
    await service.isAllowed('https://hotelacme.com');
    service.invalidate();
    await service.isAllowed('https://hotelacme.com');
    expect(findMany).toHaveBeenCalledTimes(2);
  });

  it('falls back to the stale cache when refresh fails', async () => {
    const service = makeService();
    findMany.mockResolvedValueOnce([{ type: 'domain', value: 'hotelacme.com' }]);
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);

    findMany.mockRejectedValueOnce(new Error('db down'));
    service.invalidate();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
  });

  it('still allows env origins when the database is down', async () => {
    findMany.mockRejectedValue(new Error('db down'));
    const service = makeService();
    await expect(service.isAllowed('https://unknown.example')).resolves.toBe(false);
    await expect(service.isAllowed('https://admin.reserve.com')).resolves.toBe(true);
  });

  it('retries soon after a failed refresh instead of caching an empty set', async () => {
    findMany.mockRejectedValueOnce(new Error('db down'));
    const service = makeService();
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(false);

    findMany.mockResolvedValueOnce([{ type: 'domain', value: 'hotelacme.com' }]);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31_000);
    await expect(service.isAllowed('https://hotelacme.com')).resolves.toBe(true);
    jest.restoreAllMocks();
  });
});
