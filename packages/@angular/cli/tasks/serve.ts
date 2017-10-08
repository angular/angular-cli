import {ServeTaskOptions} from '../commands/serve';
import {spawn} from 'child_process';
import {bazelBinDirectory, buildBazel, buildIBazel} from '../utilities/bazel-utils';
import {getAppFromConfig} from '../utilities/app-utils';
import * as path from 'path';

const Task = require('../ember-cli/lib/models/task');

export default Task.extend({
  run: function (serveTaskOptions: ServeTaskOptions) {
    const app = getAppFromConfig(this.app);
    const bazelTarget = path.parse(app.root).dir;
    if (serveTaskOptions.watch) {
      // TODO vsavkin: remove the first build once the webpack rule handles static
      return buildBazel(this.ui, `${bazelTarget}:compile_and_static`, true).then(() => {
        return startIBazelAndWebpack(this.ui, bazelTarget, serveTaskOptions);
      }).catch(() => {
        return startIBazelAndWebpack(this.ui, bazelTarget, serveTaskOptions);
      });
    } else {
      // TODO vsavkin: remove the first build once the webpack rule handles static
      return buildBazel(this.ui, `${bazelTarget}:compile_and_static`, true).then(() => {
        return buildBazel(this.ui, bazelTarget).then(() => {
          return startWebpackDevServer(this.ui, bazelTarget, serveTaskOptions);
        });
      });
    }
  }
});

function startIBazelAndWebpack(ui: string, bazelTarget: string,
                               serveTaskOptions: ServeTaskOptions): Promise<any> {
  const a = buildIBazel(ui, `${bazelTarget}:compile_and_static`);
  const b = startWebpackDevServer(ui, bazelTarget, serveTaskOptions);
  return Promise.race([a, b]);
}

function startWebpackDevServer(_ui: any, app: string,
                               serveTaskOptions: ServeTaskOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    const webpack = spawn('webpack-dev-server', [
      '--config',
      'node_modules/@nrwl/bazel/src/utils/webpack.config.js',
      '--env.bin_dir',
      bazelBinDirectory(),
      '--env.package',
      app,
      '--env.mode',
      'dev',
      '--port',
      serveTaskOptions.port.toString(),
      '--host',
      serveTaskOptions.host.toString()
    ], {stdio: [0, 1, 1]});

    webpack.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // print an error here
        reject();
      }
    });
  });
}
