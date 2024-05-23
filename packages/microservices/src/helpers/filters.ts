type QueryObject = {
  [key: string]: string | string[] | undefined;
};

export type QueryObjectNorm<T> = {
  [Property in keyof T as `has${Capitalize<
    string & Property
  >}`]-?: () => boolean;
} & {
  [Property in keyof T as `get${Capitalize<
    string & Property
  >}`]-?: () => string[];
};

export type ObjectArr<T extends Readonly<Array<string>>> = {
  [key in T[number]]?: string | string[];
};

export function normalize<T extends QueryObject>(
  keys: readonly (string & keyof T)[],
  object: Partial<T>,
): QueryObjectNorm<T> {
  const obj: { [key: string]: unknown } = {};
  for (const k of keys) {
    const key = k.charAt(0).toUpperCase() + k.slice(1);
    let querystr: string[] = [];
    const value = object[key];
    if (value) {
      querystr = querystr.concat(value);
    }
    obj['has' + key] = () => querystr.length > 0;
    obj['get' + key] = () => querystr;
  }
  return obj as QueryObjectNorm<T>;
}
