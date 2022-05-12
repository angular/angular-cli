const global: { [name: string]: any } = Object.create(null);

export function setGlobalVariable(name: string, value: any) {
  global[name] = value;
}

export function getGlobalVariable<T = any>(name: string): T {
  if (!(name in global)) {
    throw new Error(`Trying to access variable "${name}" but it's not defined.`);
  }
  return global[name] as T;
}
