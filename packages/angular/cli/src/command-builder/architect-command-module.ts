/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Argv } from 'yargs';
import { getProjectByCwd } from '../utilities/config';
import { memoize } from '../utilities/memoize';
import { ArchitectBaseCommandModule } from './architect-base-command-module';
import {
  CommandModuleError,
  CommandModuleImplementation,
  Options,
  OtherOptions,
} from './command-module';

export interface ArchitectCommandArgs {
  configuration?: string;
  project?: string;
}

export abstract class ArchitectCommandModule
  extends ArchitectBaseCommandModule<ArchitectCommandArgs>
  implements CommandModuleImplementation<ArchitectCommandArgs>
{
  abstract readonly multiTarget: boolean;

  async builder(argv: Argv): Promise<Argv<ArchitectCommandArgs>> {
    const localYargs: Argv<ArchitectCommandArgs> = argv
      .positional('project', {
        describe: 'The name of the project to build. Can be an application or a library.',
        type: 'string',
      })
      .option('configuration', {
        describe:
          `One or more named builder configurations as a comma-separated ` +
          `list as specified in the "configurations" section in angular.json.\n` +
          `The builder uses the named configurations to run the given target.\n` +
          `For more information, see https://angular.io/guide/workspace-config#alternate-build-configurations.`,
        alias: 'c',
        type: 'string',
      })
      .strict();

    const project = this.getArchitectProject();
    if (!project) {
      return localYargs;
    }

    const target = this.getArchitectTarget();
    const schemaOptions = await this.getArchitectTargetOptions({
      project,
      target,
    });

    return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
  }

  async run(options: Options<ArchitectCommandArgs> & OtherOptions): Promise<number | void> {
    const target = this.getArchitectTarget();

    const { configuration = '', project, ...architectOptions } = options;

    if (!project) {
      // This runs each target sequentially.
      // Running them in parallel would jumble the log messages.
      let result = 0;
      const projectNames = this.getProjectNamesByTarget(target);
      if (!projectNames) {
        throw new CommandModuleError(
          this.missingErrorTarget ?? 'Cannot determine project or target for command.',
        );
      }

      for (const project of projectNames) {
        result |= await this.runSingleTarget({ configuration, target, project }, architectOptions);
      }

      return result;
    } else {
      return await this.runSingleTarget({ configuration, target, project }, architectOptions);
    }
  }

  private getArchitectProject(): string | undefined {
    const workspace = this.context.workspace;
    if (!workspace) {
      return undefined;
    }

    const [, projectName] = this.context.args.positional;

    if (projectName) {
      if (!workspace.projects.has(projectName)) {
        throw new CommandModuleError(`Project '${projectName}' does not exist.`);
      }

      return projectName;
    }

    const target = this.getArchitectTarget();
    const projectFromTarget = this.getProjectNamesByTarget(target);

    return projectFromTarget?.length ? projectFromTarget[0] : undefined;
  }

  private getArchitectTarget(): string {
    return this.commandName;
  }

  @memoize
  private getProjectNamesByTarget(target: string): string[] | undefined {
    const workspace = this.getWorkspaceOrThrow();

    const allProjectsForTargetName: string[] = [];
    for (const [name, project] of workspace.projects) {
      if (project.targets.has(target)) {
        allProjectsForTargetName.push(name);
      }
    }

    if (allProjectsForTargetName.length === 0) {
      return undefined;
    }

    if (this.multiTarget) {
      // For multi target commands, we always list all projects that have the target.
      return allProjectsForTargetName;
    } else {
      if (allProjectsForTargetName.length === 1) {
        return allProjectsForTargetName;
      }

      const maybeProject = getProjectByCwd(workspace);
      if (maybeProject && allProjectsForTargetName.includes(maybeProject)) {
        return [maybeProject];
      }
    }

    return undefined;
  }
}
