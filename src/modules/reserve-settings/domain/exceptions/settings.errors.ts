export class UnknownSettingError extends Error {
  constructor(module: string, key: string) {
    super(`Unknown setting: ${module}.${key}`);
    this.name = 'UnknownSettingError';
  }
}

export class InvalidSettingValueError extends Error {
  constructor(module: string, key: string, why: string) {
    super(`Invalid value for ${module}.${key}: ${why}`);
    this.name = 'InvalidSettingValueError';
  }
}

export class ForbiddenSettingError extends Error {
  constructor(module: string, key: string) {
    super(`Setting ${module}.${key} is not writable at tenant scope`);
    this.name = 'ForbiddenSettingError';
  }
}
