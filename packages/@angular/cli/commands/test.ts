import { Command, CommandScope, Option } from '../models/command';
import TestTask from '../tasks/test';


export interface TestOptions {
  watch?: boolean;
  codeCoverage?: boolean;
  singleRun?: boolean;
  browsers?: string;
  colors?: boolean;
  log?: string;
  port?: number;
  reporters?: string;
  sourcemaps?: boolean;
  progress?: boolean;
  config: string;
  poll?: number;
  environment?: string;
  app?: string;
  preserveSymlinks?: boolean;
}

export default class TestCommand extends Command {
  public readonly name = 'test';
  public readonly description = 'Run unit tests in existing project.';
  public static aliases = ['t'];
  public readonly scope = CommandScope.inProject;
  public readonly arguments: string[] = [];
  public readonly options: Option[] = [];

  public async run(options: TestOptions) {
    const testTask = new TestTask({
      ui: this.ui,
      project: this.project
    });

    return await testTask.run(options);
  }
}
