import * as path from 'path';

export const ngAppResolve = (resolvePath: string): string => {
  return path.resolve(process.cwd(), resolvePath);
};

export const webpackOutputOptions = {
  colors: true,
  hash: true,
  timings: true,
  chunks: true,
  chunkModules: false,
  children: false, // listing all children is very noisy in AOT and hides warnings/errors
  modules: false,
  reasons: false,
  warnings: true,
  assets: false, // listing all assets is very noisy when using assets directories
  version: false
};

export const verboseWebpackOutputOptions = {
  children: true,
  assets: true,
  version: true,
  reasons: true,
  chunkModules: false // TODO: set to true when console to file output is fixed
};
