import { WebpackConfigOptions } from '../webpack-config';

/**
 * Returns a partial specific to creating a bundle for node
 * @param _wco Options which are include the build options and app config
 */
export const getServerConfig = function (_wco: WebpackConfigOptions) {
  return {
    target: 'node',
    output: {
      libraryTarget: 'commonjs'
    },
    externals: [
      /^@angular/,
      function (_: any, request: any, callback: (error?: any, result?: any) => void) {
        // Absolute & Relative paths are not externals
        if (request.match(/^\.{0,2}\//)) {
          return callback();
        }

        try {
          // Attempt to resolve the module via Node
          const e = require.resolve(request);
          if (/node_modules/.test(e)) {
            // It's a node_module
            callback(null, request);
          } else {
            // It's a system thing (.ie util, fs...)
            callback();
          }
        } catch (e) {
          // Node couldn't find it, so it must be user-aliased
          callback();
        }
      }
    ]
  };
};
