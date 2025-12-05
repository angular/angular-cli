import { resolve } from 'path';
import { fileURLToPath } from 'url';

export default {
  mode: 'development',
  entry: resolve(fileURLToPath(import.meta.url), '../src/main.js'),
  devServer: {
    // Force an IPv4 address as with RBE there are currently resolution issues with IPv6 addresses.
    // http://localhost is resolved to IPv6 address with vite and webpack but to IPv4 with node fetch.
    host: '127.0.0.1',
  },
  module: {
    rules: [
      // rxjs 6 requires directory imports which are not support in ES modules.
      // Disabling `fullySpecified` allows Webpack to ignore this but this is
      // not ideal because it currently disables ESM behavior import for all JS files.
      { test: /\.[m]?js$/, resolve: { fullySpecified: false } },
    ],
  },
  output: {
    path: resolve(fileURLToPath(import.meta.url), '../dist'),
    filename: 'bundle.js',
  },
};
