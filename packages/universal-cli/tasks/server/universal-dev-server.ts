import * as path from 'path';
import { webpackOutputOptions } from '../../models/webpack-build-utils';
const nodemon = require('nodemon');
const tinyLr = require('tiny-lr');

export class UniversalDevServer {
  private appPath: string = '';
  private nodemonConfig: any;
  private demon: any;
  private liveServer: any;

  constructor(private webpackCompiler: any, private webpackDevServerConfiguration: any) {
    this.appPath = path.join(
      webpackDevServerConfiguration.contentBase,
      `../dist/${webpackDevServerConfiguration.filename.replace('.ts', '.bundle.js')}`
    );
    this.liveServer = new tinyLr.Server();
    this.liveServer.listen();
  }

  public listen(port: number, host: string, callBack: any) {
    this.nodemonConfig = {
      script: this.appPath,
      runOnChangeOnly: true,
      env: { 'PORT': port },
      verbose: true,
      ext: 'noop',
      watch: ['noop/'],
      ignore: ['*'],
      stdout: false,
      stderr: false
    };

    this.demon = nodemon(this.nodemonConfig);
    this.demon
      .on('restart', () => {
        setTimeout(() => {
          this.liveServer.changed({
            body: {
              files: ['LiveReload files']
            }
          });
        }, 800);
      })
      .on('stdout', (stdout: any) => {
        console.log(stdout.toString().trim());
      })
      .on('stderr', (stderr: any) => {
        console.log(stderr.toString());
      });

    this.webpackCompiler.plugin('done', () => {
      this.demon.restart();
    });
    this.webpackCompiler.watch(this.webpackDevServerConfiguration, (err: any, stats: any) => {
      if (err) {
        console.error(err.stack || err);
        process.stdout.write('webpack: bundle is now INVALID.');
        if (err.details) { console.error(err.details); }
      }

      process.stdout.write(stats.toString(webpackOutputOptions) + '\n');
      process.stdout.write('webpack: bundle is now VALID\n');

      callBack(err, stats);
    });
  }
}
