import { NamedModulesPlugin } from 'webpack';

import { WebpackConfigOptions } from '../webpack-config';

export const getDevConfig = function (_wco: WebpackConfigOptions) {
  return {
    plugins: [new NamedModulesPlugin()]
  };
};
