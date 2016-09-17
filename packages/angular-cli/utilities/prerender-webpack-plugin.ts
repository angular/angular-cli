const path = require('path');
import { spawn } from 'child_process';

export interface IWebpackPrerender {
  templatePath: string;
  configPath: string;
  appPath: string;
}

export class PrerenderWebpackPlugin {
  constructor(private options: IWebpackPrerender) {}

  apply(compiler: any) {
    compiler.plugin('emit', (compilation: any, callback: Function) => {
      let proc = spawn('node', [
          `${path.resolve(__dirname, 'prerender-bootstrapper.js')}`,
          this.options.appPath,
          this.options.templatePath,
          this.options.configPath],
        {
          cwd: this.options.appPath
        });
      proc.stderr.on('data', (e: any) => {
        console.error('error in app shell', e.toString());
        callback();
      });
      proc.stdout.on('data', (data: string | Buffer) => {
        compilation.assets[path.relative(this.options.appPath, this.options.templatePath)] = {
          source: () => data.toString(),
          size: () => data.toString().length
        };
        callback();
      });
    });
  }
};
