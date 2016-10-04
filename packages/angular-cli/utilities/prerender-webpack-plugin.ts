const path = require('path');
import { spawnSync } from 'child_process';

export interface IWebpackPrerender {
  templatePath: string;
  configPath: string;
  appPath: string;
}

export class PrerenderWebpackPlugin {
  constructor(private options: IWebpackPrerender) {}

  apply(compiler: any) {
    compiler.plugin('emit', (compilation: any, callback: Function) => {
      let relativeTemplatePath = path.relative(this.options.appPath, this.options.templatePath);
      let proc = spawnSync('node', [
          `${path.resolve(__dirname, 'prerender-bootstrapper.js')}`,
          this.options.appPath,
          this.options.configPath],
        {
          cwd: this.options.appPath,
          input: compilation.assets[relativeTemplatePath].source()
        });
      if (process.stderr.toString()) {
        console.error('error in app shell', process.stderr.toString());
        return callback();
      }

      compilation.assets[relativeTemplatePath] = {
        source: () => proc.stdout.toString(),
        size: () => proc.stdout.toString().length
      };
      callback();
    });
  }
};
