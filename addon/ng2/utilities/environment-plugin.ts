import * as fs from 'fs';

interface WebpackPlugin {
  apply(compiler: any): void;
}

interface NgCliEnvrionmentConfig {
  env?: string;
  file?: string;
  alias?: string;
}

export class NgCliEnvironmentPlugin implements WebpackPlugin {
  _file: string;
  _alias: string;
  _env: string;

  constructor(config: any) {
    if (typeof config === 'string') {
      config = {env: config};
    }
    if (typeof config.env !== 'string') {
      throw new Error('must provide env')
    }
    const ALIAS = {
      '"dev"':         'dev',
      'development':   'dev',
      '"development"': 'dev',
      '"prod"':        'prod',
      'production':    'prod',
      '"production"':  'prod',
      '"test"':        'test',
      'testing':       'test',
      '"testing"':     'test',
    };
    const ENV = config.env.toLowerCase();

    this._file = config.file || 'environment';
    this._alias = config.alias || ALIAS;
    this._env =  this._alias[ENV] || ENV;
  }

  isEnvFile(file: string): boolean {
    return file.indexOf(this._file + '.') !== -1;
  }

  replaceFile(file: string): any {
    return file
      .replace(this._file, this._file + '.' + this._env);
  }

  updateResult(result: any): any {
    ['request', 'userRequest', 'resource']
      .filter((key) => { return result[key]; })
      .forEach((key) => {
        result[key] = this.replaceFile(result[key]);
      });

    return result;
  }

  apply(compiler: any): void {
    compiler.plugin('normal-module-factory', (normalModuleFactory: any) => {
        normalModuleFactory.plugin('after-resolve', (result, callback) => {
          var _resource = result['resource'];
          if (!this.isEnvFile(_resource)) {
            return callback(null, result);
          }
          var envFile = this.replaceFile(_resource);

          fs.stat(envFile, (err, stats) => {
            if (err || !stats.isFile()) {
              var errorText = (!err && stats.isFile()) ? 'Is not a file.' : 'Does not exist.';
              console.log('\nWARNING:\n' + envFile + '\n' + errorText + ' ' + 'Using file\n' + _resource + '\n');
              return callback(null, result);
            }
            // mutate result
            var newResult = this.updateResult(result);
            return callback(null, newResult);
          });

        });
    });
  }
}
