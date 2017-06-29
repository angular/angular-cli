import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import * as webpack from 'webpack';

import { getAppFromConfig } from '../utilities/app-utils';
import { EjectTaskOptions } from '../commands/eject';
import { NgCliWebpackConfig } from '../models/webpack-config';
import { CliConfig } from '../models/config';
import { AotPlugin } from '@ngtools/webpack';
import { yellow } from 'chalk';

import denodeify = require('denodeify');
import {oneLine, stripIndent} from 'common-tags';

const exists = (p: string) => Promise.resolve(fs.existsSync(p));
const writeFile = (denodeify(fs.writeFile) as (...args: any[]) => Promise<any>);
const angularCliPlugins = require('../plugins/webpack');


const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const SilentError = require('silent-error');
const licensePlugin = require('license-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const Task = require('../ember-cli/lib/models/task');

const ProgressPlugin = require('webpack/lib/ProgressPlugin');


export const pluginArgs = Symbol('plugin-args');
export const postcssArgs = Symbol('postcss-args');

const pree2eNpmScript = `webdriver-manager update --standalone false --gecko false --quiet`;


class JsonWebpackSerializer {
  public imports: {[name: string]: string[]} = {};
  public variableImports: {[name: string]: string} = {
    'fs': 'fs',
    'path': 'path',
  };
  public variables: {[name: string]: string} = {
    'nodeModules': `path.join(process.cwd(), 'node_modules')`,
    'realNodeModules': `fs.realpathSync(nodeModules)`,
    'genDirNodeModules':
      `path.join(process.cwd(), '${this._appRoot}', '$$_gendir', 'node_modules')`,
  };
  private _postcssProcessed = false;


  constructor(private _root: string, private _dist: string, private _appRoot: string) {}

  private _escape(str: string) {
    return '\uFF01' + str + '\uFF01';
  }

  private _serializeRegExp(re: RegExp) {
    return this._escape(re.toString());
  }

  private _serializeFunction(fn: Function) {
    return this._escape(fn.toString());
  }

  private _relativePath(of: string, to: string) {
    return this._escape(`path.join(${of}, ${JSON.stringify(to)})`);
  }

  private _addImport(module: string, importName: string) {
    if (!this.imports[module]) {
      this.imports[module] = [];
    }
    if (this.imports[module].indexOf(importName) == -1) {
      this.imports[module].push(importName);
    }
  }

  private _globCopyWebpackPluginSerialize(value: any): any {
    let patterns = value.options.patterns;
    let globOptions = value.options.globOptions;
    return {
      patterns,
      globOptions: this._globReplacer(globOptions)
    };
  }

  private _commonsChunkPluginSerialize(value: any): any {
    let minChunks = value.minChunks;
    switch (typeof minChunks) {
      case 'function':
        minChunks = this._serializeFunction(value.minChunks);
        break;
    }

    return {
      name: value.chunkNames,
      filename: value.filenameTemplate,
      minChunks,
      chunks: value.selectedChunks,
      async: value.async,
      minSize: value.minSize
    };
  }

  private _extractTextPluginSerialize(value: any): any {
    return {
      filename: value.filename,
      disable: value.options.disable
    };
  }

  private _aotPluginSerialize(value: AotPlugin): any {
    const tsConfigPath = path.relative(this._root, value.options.tsConfigPath);
    const basePath = path.dirname(tsConfigPath);
    return Object.assign({}, value.options, {
      tsConfigPath,
      mainPath: path.relative(value.basePath, value.options.mainPath),
      hostReplacementPaths: Object.keys(value.options.hostReplacementPaths)
        .reduce((acc: any, key: string) => {
          const replacementPath = value.options.hostReplacementPaths[key];
          key = path.relative(basePath, key);
          acc[key] = path.relative(basePath, replacementPath);
          return acc;
        }, {}),
      exclude: Array.isArray(value.options.exclude)
        ? value.options.exclude.map((p: any) => {
          return p.startsWith('/') ? path.relative(value.basePath, p) : p;
        })
        : value.options.exclude
    });
  }

  private _htmlWebpackPlugin(value: any) {
    const chunksSortMode = value.options.chunksSortMode;
    this.variables['entryPoints'] = JSON.stringify(chunksSortMode.entryPoints);
    return Object.assign({}, value.options, {
      template: './' + path.relative(this._root, value.options.template),
      filename: './' + path.relative(this._dist, value.options.filename),
      chunksSortMode: this._serializeFunction(chunksSortMode)
    });
  }

  _environmentPlugin(plugin: any) {
    return plugin.defaultValues;
  }

  private _licenseWebpackPlugin(plugin: any) {
    return {
      'pattern': plugin.pattern
    };
  }

  private _pluginsReplacer(plugins: any[]) {
    return plugins.map(plugin => {
      let args = plugin.options || undefined;

      switch (plugin.constructor) {
        case ProgressPlugin:
          this.variableImports['webpack/lib/ProgressPlugin'] = 'ProgressPlugin';
          break;
        case webpack.NoEmitOnErrorsPlugin:
          this._addImport('webpack', 'NoEmitOnErrorsPlugin');
          break;
        case webpack.NamedModulesPlugin:
          this._addImport('webpack', 'NamedModulesPlugin');
          break;
        case (<any>webpack).HashedModuleIdsPlugin:
          this._addImport('webpack', 'HashedModuleIdsPlugin');
          break;
        case webpack.SourceMapDevToolPlugin:
          this._addImport('webpack', 'SourceMapDevToolPlugin');
          break;
        case webpack.optimize.UglifyJsPlugin:
          this._addImport('webpack.optimize', 'UglifyJsPlugin');
          break;
        case angularCliPlugins.BaseHrefWebpackPlugin:
        case angularCliPlugins.SuppressExtractedTextChunksWebpackPlugin:
          this._addImport('@angular/cli/plugins/webpack', plugin.constructor.name);
          break;
        case angularCliPlugins.GlobCopyWebpackPlugin:
          args = this._globCopyWebpackPluginSerialize(plugin);
          this._addImport('@angular/cli/plugins/webpack', 'GlobCopyWebpackPlugin');
          break;
        case webpack.optimize.CommonsChunkPlugin:
          args = this._commonsChunkPluginSerialize(plugin);
          this._addImport('webpack.optimize', 'CommonsChunkPlugin');
          break;
        case ExtractTextPlugin:
          args = this._extractTextPluginSerialize(plugin);
          this.variableImports['extract-text-webpack-plugin'] = 'ExtractTextPlugin';
          break;
        case CircularDependencyPlugin:
          this.variableImports['circular-dependency-plugin'] = 'CircularDependencyPlugin';
          break;
        case AotPlugin:
          args = this._aotPluginSerialize(plugin);
          this._addImport('@ngtools/webpack', 'AotPlugin');
          break;
        case HtmlWebpackPlugin:
          args = this._htmlWebpackPlugin(plugin);
          this.variableImports['html-webpack-plugin'] = 'HtmlWebpackPlugin';
          break;
        case webpack.EnvironmentPlugin:
          args = this._environmentPlugin(plugin);
          this._addImport('webpack', 'EnvironmentPlugin');
          break;
        case licensePlugin:
          args = this._licenseWebpackPlugin(plugin);
          this.variableImports['license-webpack-plugin'] = 'licensePlugin';
        default:
          if (plugin.constructor.name == 'AngularServiceWorkerPlugin') {
            this._addImport('@angular/service-worker/build/webpack', plugin.constructor.name);
          }
          break;
      }

      const argsSerialized = JSON.stringify(args, (k, v) => this._replacer(k, v), 2) || '';
      return `\uFF02${plugin.constructor.name}(${argsSerialized})\uFF02`;
    });
  }

  private _resolveReplacer(value: any) {
    return Object.assign({}, value, {
      modules: value.modules.map((x: string) => './' + path.relative(this._root, x))
    });
  }

  private _outputReplacer(value: any) {
    return Object.assign({}, value, {
      path: this._relativePath('process.cwd()', path.relative(this._root, value.path))
    });
  }

  private _path(l: string) {
    return l.split('!').map(x => {
      return path.isAbsolute(x) ? './' + path.relative(this._root, x) : x;
    }).join('!');
  }

  private _entryReplacer(value: any) {
    const newValue = Object.assign({}, value);
    for (const key of Object.keys(newValue)) {
      newValue[key] = newValue[key].map((l: string) => this._path(l));
    }
    return newValue;
  }

  private _loaderReplacer(loader: any) {
    if (typeof loader == 'string') {
      if (loader.match(/\/node_modules\/extract-text-webpack-plugin\//)) {
        return 'extract-text-webpack-plugin';
      } else if (loader.match(/@ngtools\/webpack\/src\/index.ts/)) {
        // return '@ngtools/webpack';
      }
    } else {
      if (loader.loader) {
        loader.loader = this._loaderReplacer(loader.loader);
      }
      if (loader.loader === 'postcss-loader' && !this._postcssProcessed) {
        const args: any = loader.options.plugins[postcssArgs];

        Object.keys(args.variableImports)
          .forEach(key => this.variableImports[key] = args.variableImports[key]);
        Object.keys(args.variables)
          .forEach(key => this.variables[key] = JSON.stringify(args.variables[key]));

        this.variables['postcssPlugins'] = loader.options.plugins;
        loader.options.plugins = this._escape('postcssPlugins');

        this._postcssProcessed = true;
      }
    }
    return loader;
  }

  private _ruleReplacer(value: any) {
    const replaceExcludeInclude = (v: any) => {
      if (typeof v == 'object') {
        if (v.constructor == RegExp) {
          return this._serializeRegExp(v);
        }
        return v;
      } else if (typeof v == 'string') {
        if (v === path.join(this._root, 'node_modules')) {
          return this._serializeRegExp(/\/node_modules\//);
        }
        return this._relativePath('process.cwd()', path.relative(this._root, v));
      } else {
        return v;
      }
    };

    if (value[pluginArgs]) {
      return {
        include: Array.isArray(value.include)
          ? value.include.map((x: any) => replaceExcludeInclude(x))
          : replaceExcludeInclude(value.include),
        test: this._serializeRegExp(value.test),
        loaders: this._escape(
          `ExtractTextPlugin.extract(${JSON.stringify(value[pluginArgs], null, 2)})`)
      };
    }

    if (value.loaders) {
      value.loaders = value.loaders.map((loader: any) => this._loaderReplacer(loader));
    }
    if (value.loader) {
      value.loader = this._loaderReplacer(value.loader);
    }
    if (value.use) {
      if (Array.isArray(value.use)) {
        value.use = value.use.map((loader: any) => this._loaderReplacer(loader));
      } else {
        value.use = this._loaderReplacer(value.loader);
      }
    }

    if (value.exclude) {
      value.exclude = Array.isArray(value.exclude)
        ? value.exclude.map((x: any) => replaceExcludeInclude(x))
        : replaceExcludeInclude(value.exclude);
    }
    if (value.include) {
      value.include = Array.isArray(value.include)
        ? value.include.map((x: any) => replaceExcludeInclude(x))
        : replaceExcludeInclude(value.include);
    }

    return value;
  }

  private _moduleReplacer(value: any) {
    return Object.assign({}, value, {
      rules: value.rules && value.rules.map((x: any) => this._ruleReplacer(x))
    });
  }

  private _globReplacer(value: any) {
    return Object.assign({}, value, {
      cwd: this._relativePath('process.cwd()', path.relative(this._root, value.cwd))
    });
  }

  private _replacer(_key: string, value: any) {
    if (value === undefined) {
      return value;
    }
    if (value === null) {
      return null;
    }
    if (value.constructor === RegExp) {
      return this._serializeRegExp(value);
    }

    return value;
  }

  serialize(config: any): string {
    // config = Object.assign({}, config);
    config['plugins'] = this._pluginsReplacer(config['plugins']);
    // Routes using PathLocationStrategy break without this.
    config['devServer'] = {
      'historyApiFallback': true
    };
    config['resolve'] = this._resolveReplacer(config['resolve']);
    config['resolveLoader'] = this._resolveReplacer(config['resolveLoader']);
    config['entry'] = this._entryReplacer(config['entry']);
    config['output'] = this._outputReplacer(config['output']);
    config['module'] = this._moduleReplacer(config['module']);
    config['context'] = undefined;

    return JSON.stringify(config, (k, v) => this._replacer(k, v), 2)
      .replace(/"\uFF01(.*?)\uFF01"/g, (_, v) => {
        return JSON.parse(`"${v}"`);
      })
      .replace(/(\s*)(.*?)"\uFF02(.*?)\uFF02"(,?).*/g, (_, indent, key, value, comma) => {
        const ctor = JSON.parse(`"${value}"`).split(/\n+/g).join(indent);
        return `${indent}${key}new ${ctor}${comma}`;
      })
      .replace(/"\uFF01(.*?)\uFF01"/g, (_, v) => {
        return JSON.parse(`"${v}"`);
      });
  }

  generateVariables(): string {
    let variableOutput = '';
    Object.keys(this.variableImports)
      .forEach((key: string) => {
        const [module, name] = key.split(/\./);
        variableOutput += `const ${this.variableImports[key]} = require` + `('${module}')`;
        if (name) {
          variableOutput += '.' + name;
        }
        variableOutput += ';\n';
      });
    variableOutput += '\n';

    Object.keys(this.imports)
      .forEach((key: string) => {
        const [module, name] = key.split(/\./);
        variableOutput += `const { ${this.imports[key].join(', ')} } = require` + `('${module}')`;
        if (name) {
          variableOutput += '.' + name;
        }
        variableOutput += ';\n';
      });
    variableOutput += '\n';

    Object.keys(this.variables)
      .forEach((key: string) => {
        variableOutput += `const ${key} = ${this.variables[key]};\n`;
      });
    variableOutput += '\n\n';

    return variableOutput;
  }
}


export default Task.extend({
  run: function (runTaskOptions: EjectTaskOptions) {
    const project = this.project;
    const cliConfig = CliConfig.fromProject();
    const config = cliConfig.config;
    const appConfig = getAppFromConfig(runTaskOptions.app);

    const tsConfigPath = path.join(process.cwd(), appConfig.root, appConfig.tsconfig);
    const outputPath = runTaskOptions.outputPath || appConfig.outDir;
    const force = runTaskOptions.force;

    if (project.root === path.resolve(outputPath)) {
      throw new SilentError ('Output path MUST not be project root directory!');
    }

    const webpackConfig = new NgCliWebpackConfig(runTaskOptions, appConfig).buildConfig();
    const serializer = new JsonWebpackSerializer(process.cwd(), outputPath, appConfig.root);
    const output = serializer.serialize(webpackConfig);
    const webpackConfigStr = `${serializer.generateVariables()}\n\nmodule.exports = ${output};\n`;

    return Promise.resolve()
      .then(() => exists('webpack.config.js'))
      .then(webpackConfigExists => {
        if (webpackConfigExists && !force) {
          throw new SilentError('The webpack.config.js file already exists.');
        }
      })
      // Read the package.json and update it to include npm scripts. We do this first so that if
      // an error already exists
      .then(() => ts.sys.readFile('package.json'))
      .then((packageJson: string) => JSON.parse(packageJson))
      .then((packageJson: any) => {
        const scripts = packageJson['scripts'];
        if (scripts['build'] && scripts['build'] !== 'ng build' && !force) {
          throw new SilentError(oneLine`
            Your package.json scripts must not contain a build script as it will be overwritten.
          `);
        }
        if (scripts['start'] && scripts['start'] !== 'ng serve' && !force) {
          throw new SilentError(oneLine`
            Your package.json scripts must not contain a start script as it will be overwritten.
          `);
        }
        if (scripts['pree2e'] && scripts['pree2e'] !== pree2eNpmScript && !force) {
          throw new SilentError(oneLine`
            Your package.json scripts must not contain a pree2e script as it will be
            overwritten.
          `);
        }
        if (scripts['e2e'] && scripts['e2e'] !== 'ng e2e' && !force) {
          throw new SilentError(oneLine`
            Your package.json scripts must not contain a e2e script as it will be overwritten.
          `);
        }
        if (scripts['test'] && scripts['test'] !== 'ng test' && !force) {
          throw new SilentError(oneLine`
            Your package.json scripts must not contain a test script as it will be overwritten.
          `);
        }

        packageJson['scripts']['build'] = 'webpack';
        packageJson['scripts']['start'] = 'webpack-dev-server --port=4200';
        packageJson['scripts']['test'] = 'karma start ./karma.conf.js';
        packageJson['scripts']['pree2e'] = pree2eNpmScript;
        packageJson['scripts']['e2e'] = 'protractor ./protractor.conf.js';

        // Add new dependencies based on our dependencies.
        const ourPackageJson = require('../package.json');
        if (!packageJson['devDependencies']) {
          packageJson['devDependencies'] = {};
        }
        packageJson['devDependencies']['webpack-dev-server']
            = ourPackageJson['dependencies']['webpack-dev-server'];

        // Update all loaders from webpack, plus postcss plugins.
        [
          'webpack',
          'autoprefixer',
          'css-loader',
          'cssnano',
          'exports-loader',
          'file-loader',
          'json-loader',
          'karma-sourcemap-loader',
          'less-loader',
          'postcss-loader',
          'postcss-url',
          'raw-loader',
          'sass-loader',
          'script-loader',
          'source-map-loader',
          'istanbul-instrumenter-loader',
          'style-loader',
          'stylus-loader',
          'url-loader',
          'circular-dependency-plugin',
        ].forEach((packageName: string) => {
          packageJson['devDependencies'][packageName] = ourPackageJson['dependencies'][packageName];
        });

        return writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n');
      })
      .then(() => JSON.parse(ts.sys.readFile(tsConfigPath)))
      .then((tsConfigJson: any) => {
        if (!tsConfigJson.exclude || force) {
          // Make sure we now include tests.  Do not touch otherwise.
          tsConfigJson.exclude = [
            'test.ts',
            '**/*.spec.ts'
          ];
        }
        return writeFile(tsConfigPath, JSON.stringify(tsConfigJson, null, 2) + '\n');
      })
      // Output the webpack.config.js.
      .then(() => writeFile('webpack.config.js', webpackConfigStr))
      .then(() => {
        // Update the CLI Config.
        config.project.ejected = true;
        cliConfig.save();
      })
      .then(() => {
        console.log(yellow(stripIndent`
          ==========================================================================================
          Ejection was successful.

          To run your builds, you now need to do the following commands:
             - "npm run build" to build.
             - "npm run test" to run unit tests.
             - "npm start" to serve the app using webpack-dev-server.
             - "npm run e2e" to run protractor.

          Running the equivalent CLI commands will result in an error.

          ==========================================================================================
          Some packages were added. Please run "npm install".
        `));
      });
  }
});
