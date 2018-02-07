// tslint:disable
// TODO: cleanup this file, it's copied as is from Angular CLI.

import { NamedModulesPlugin } from 'webpack';

import { WebpackConfigOptions } from '../build-options';

export function getDevConfig(_wco: WebpackConfigOptions) {
  return {
    plugins: [new NamedModulesPlugin()]
  };
}
