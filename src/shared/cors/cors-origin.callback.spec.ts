import { createCorsOriginResolver } from './cors-origin.callback';

describe('createCorsOriginResolver', () => {
  const makeService = (impl: jest.Mock) => ({ isAllowed: impl }) as any;

  it('allows a request with no Origin header WITHOUT consulting the allowlist', () => {
    // curl, server-to-server and Stripe webhooks send no Origin. CORS does not
    // apply to them; blocking here breaks every /api/webhooks/* route.
    const isAllowed = jest.fn();
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve(undefined, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it('treats an empty-string Origin as absent', () => {
    const isAllowed = jest.fn();
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('', callback);

    expect(callback).toHaveBeenCalledWith(null, true);
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it('allows an origin the service accepts', async () => {
    const isAllowed = jest.fn().mockResolvedValue(true);
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('https://app.hotelacme.com', callback);
    await new Promise(process.nextTick);

    expect(isAllowed).toHaveBeenCalledWith('https://app.hotelacme.com');
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('denies an origin the service rejects, without raising an error', async () => {
    const isAllowed = jest.fn().mockResolvedValue(false);
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('https://evil.example', callback);
    await new Promise(process.nextTick);

    expect(callback).toHaveBeenCalledWith(null, false);
  });

  it('propagates a service failure as a callback error and denies', async () => {
    const failure = new Error('db down');
    const isAllowed = jest.fn().mockRejectedValue(failure);
    const resolve = createCorsOriginResolver(makeService(isAllowed));
    const callback = jest.fn();

    resolve('https://app.hotelacme.com', callback);
    await new Promise(process.nextTick);

    expect(callback).toHaveBeenCalledWith(failure, false);
  });
});
