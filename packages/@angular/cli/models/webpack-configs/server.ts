import { WebpackConfigOptions } from '../webpack-config';
import { requireProjectModule } from '../../utilities/require-project-module';

/**
 * Returns a partial specific to creating a bundle for node
 * @param wco Options which are include the build options and app config
 */
export function getServerConfig(wco: WebpackConfigOptions) {

  const projectTs = requireProjectModule(wco.projectRoot, 'typescript');

  const supportES2015 = wco.tsConfig.options.target !== projectTs.ScriptTarget.ES3
                     && wco.tsConfig.options.target !== projectTs.ScriptTarget.ES5;

  const config: any = {
    resolve: {
      mainFields: [
        ...(supportES2015 ? ['es2015'] : []),
        'main', 'module',
      ],
    },
    target: 'node',
    output: {
      libraryTarget: 'commonjs'
    },
    node: false,
  };

  if (wco.buildOptions.bundleDependencies == 'none') {
    config.externals = [
      /^@angular/,
      (_: any, request: any, callback: (error?: any, result?: any) => void) => {
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
    ];
  }

  return config;
}
