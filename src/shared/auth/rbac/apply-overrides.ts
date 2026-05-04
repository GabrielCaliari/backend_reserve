export interface AdminOverrides {
  grants: ReadonlySet<string>;
  denies: ReadonlySet<string>;
}

/** (held ∪ grants) ∖ denies — deny sempre vence no read. */
export function applyOverrides(held: ReadonlySet<string>, overrides: AdminOverrides): Set<string> {
  const effective = new Set([...held, ...overrides.grants]);
  for (const denied of overrides.denies) effective.delete(denied);
  return effective;
}
