import { WebpackConfigOptions } from '../webpack-config';

import { getBrowserConfig } from './browser';

export function getElectronConfig(wco: WebpackConfigOptions) {
  const config = <any>getBrowserConfig(wco);
  config.target = 'electron-renderer';
  return config;
}
