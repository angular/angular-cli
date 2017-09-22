import { NamedModulesPlugin } from 'webpack';

import { WebpackConfigOptions } from '../webpack-config';

export function getDevConfig(_wco: WebpackConfigOptions) {
  return {
    plugins: [new NamedModulesPlugin()]
  };
}
