const ENV_PREFIX = 'LEGACY_CLI__';

export function setGlobalVariable(name: string, value: any) {
  if (value === undefined) {
    delete process.env[ENV_PREFIX + name];
  } else {
    process.env[ENV_PREFIX + name] = JSON.stringify(value);
  }
}

export function getGlobalVariable<T = any>(name: string): T {
  const value = process.env[ENV_PREFIX + name];
  if (value === undefined) {
    throw new Error(`Trying to access variable "${name}" but it's not defined.`);
  }
  return JSON.parse(value) as T;
}

export function getGlobalVariablesEnv(): NodeJS.ProcessEnv {
  return Object.keys(process.env)
    .filter((v) => v.startsWith(ENV_PREFIX))
    .reduce<NodeJS.ProcessEnv>((vars, n) => {
      vars[n] = process.env[n];
      return vars;
    }, {});
}
