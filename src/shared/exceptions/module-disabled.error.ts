export class ModuleDisabledError extends Error {
  public readonly code = 'MODULE_DISABLED';

  constructor(public readonly module: string) {
    super(`Module '${module}' is disabled for this tenant`);
    this.name = 'ModuleDisabledError';
  }
}
