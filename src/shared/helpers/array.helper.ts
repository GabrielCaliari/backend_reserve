/**
 * Array utility helpers
 */

export function separar<T>(itens: T[], maximo: number): T[][] {
  return itens.reduce<T[][]>((acumulador, item, indice) => {
    const grupo = Math.floor(indice / maximo);
    acumulador[grupo] = [...(acumulador[grupo] || []), item];
    return acumulador;
  }, []);
}

export function separarPorPropriedade<T extends Record<string, unknown>>(
  array: T[],
  propriedade: keyof T,
): Record<string, T[]> {
  return array.reduce<Record<string, T[]>>((acc, item) => {
    const valor = String(item[propriedade]);
    if (!acc[valor]) {
      acc[valor] = [];
    }
    acc[valor].push(item);
    return acc;
  }, {});
}

export function inverterObjeto(obj: Record<string, unknown>): Record<string, string> {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[String(value)] = key;
    return acc;
  }, {});
}

export function getKeysWithTrueValue(obj: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    if (obj[key] === true) {
      keys.push(key);
    }
  }
  return keys;
}
