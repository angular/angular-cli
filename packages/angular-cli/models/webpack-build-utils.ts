import * as path from 'path';

export const ngAppResolve = (resolvePath: string): string => {
  return path.resolve(process.cwd(), resolvePath);
};

const webpackOutputOptions = {
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

const verboseWebpackOutputOptions = {
  children: true,
  assets: true,
  version: true,
  reasons: true,
  chunkModules: false // TODO: set to true when console to file output is fixed
};

export function getWebpackStatsConfig(verbose = false) {
    return verbose
           ? Object.assign(webpackOutputOptions, verboseWebpackOutputOptions)
           : webpackOutputOptions;
}
