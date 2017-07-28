import * as fs from 'fs';
import * as path from 'path';

import { WebpackConfigOptions } from '../webpack-config';

export const getCustomConfig = function (_wco: WebpackConfigOptions) {
  const customConfigPath = path.join(_wco.projectRoot, 'webpack.config.js');

  console.log('checking for webpack custom config in', customConfigPath);
  if (fs.statSync(customConfigPath)) {
    console.log('Found! Loading...');
    return require(customConfigPath);
  }

  return {};
};
