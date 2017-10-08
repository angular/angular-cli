import {getAppFromConfig} from '../utilities/app-utils';
import {BuildTaskOptions} from '../commands/build';
import {buildBazel, buildIBazel} from '../utilities/bazel-utils';
import * as path from 'path';

const Task = require('../ember-cli/lib/models/task');


export default Task.extend({
  run: function (runTaskOptions: BuildTaskOptions) {
    const app = getAppFromConfig(this.app);
    const bazelTarget = path.parse(app.root).dir;
    if (runTaskOptions.watch) {
      // TODO vsavkin: remove the first build once the webpack rule handles static
      return buildBazel(this.ui, `${bazelTarget}:compile_and_static`, true).then(() => {
        return buildIBazel(this.ui, bazelTarget);
      }).catch(() => {
        return buildIBazel(this.ui, bazelTarget);
      });
    } else {
      // TODO vsavkin: remove the first build once the webpack rule handles static
      return buildBazel(this.ui, `${bazelTarget}:compile_and_static`, true).then(() => {
        return buildBazel(this.ui, bazelTarget);
      }).catch(() => {
        return buildBazel(this.ui, bazelTarget);
      });
    }
  }
});
