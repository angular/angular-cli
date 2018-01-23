import { runTarget } from '../utilities/architect';
const Task = require('../ember-cli/lib/models/task');


export interface CliLintConfig {
  files?: (string | string[]);
  project?: string;
  tslintConfig?: string;
  exclude?: (string | string[]);
}

export class LintTaskOptions {
  fix: boolean;
  force: boolean;
  format ?= 'prose';
  silent ?= false;
  typeCheck ?= false;
  configs: Array<CliLintConfig>;
  app?: string;
}

export default Task.extend({
  run: function (options: LintTaskOptions) {
    return runTarget(this.project.root, 'tslint', options).toPromise().then(buildEvent => {
      if (buildEvent.success === false) {
        return Promise.reject('Run failed');
      }
    });
  }
});
