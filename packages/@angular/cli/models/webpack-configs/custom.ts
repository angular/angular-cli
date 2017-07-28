import * as fs from 'fs';
import * as path from 'path';

import { WebpackConfigOptions } from '../webpack-config';

export const getCustomConfig = function (_wco: WebpackConfigOptions) {
  const customConfigPath = path.join(_wco.projectRoot, 'webpack.config.js');

  if (fs.existsSync(customConfigPath)) {
    return require(customConfigPath);
  }

  return {};
};
