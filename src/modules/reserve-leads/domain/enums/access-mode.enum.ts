export enum EAccessMode {
  public = 'public',
  private = 'private',
  restricted = 'restricted',
}

export type TAccessMode = keyof typeof EAccessMode;
