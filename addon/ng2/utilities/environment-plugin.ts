import * as fs from 'fs';
import * as path from 'path';

interface WebpackPlugin {
  apply(compiler: any): void;
}

interface EnvOptions {
  path: string;
  src: string;
  dest: string;
}

export class NgCliEnvironmentPlugin implements WebpackPlugin {
  config: EnvOptions;

  constructor(public config: EnvOptions) {}

  isEnvFile(file: string): boolean {
    return file === path.resolve(this.config.path, this.config.src);
  }

  replaceFile(file: string): any {
    return path.resolve(this.config.path, this.config.dest);
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
              const destPath = path.resolve(this.config.path, this.config.dest);
              const errorText = (!err && stats.isFile()) ? 'is not a file.' : 'does not exist.';
              throw new Error(`${destPath} ${errorText}`);
            }
            // mutate result
            var newResult = this.updateResult(result);
            return callback(null, newResult);
          });

        });
    });
  }
}
