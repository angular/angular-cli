import { Command, CommandScope, Option } from '../models/command';
import { ServeTaskOptions } from './serve';

export interface E2eTaskOptions extends ServeTaskOptions {
  config: string;
  serve: boolean;
  webdriverUpdate: boolean;
  specs: string[];
  suite: string;
  elementExplorer: boolean;
}

export default class E2eCommand extends Command {
  public readonly name = 'e2e';
  public readonly description = 'Run e2e tests in existing project.';
  public static aliases: string[] = ['e'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [];

  public run(options: E2eTaskOptions) {
    const E2eTask = require('../tasks/e2e').E2eTask;

    const e2eTask = new E2eTask({
      ui: this.ui,
      project: this.project
    });

    return e2eTask.run(options);
  }
}
