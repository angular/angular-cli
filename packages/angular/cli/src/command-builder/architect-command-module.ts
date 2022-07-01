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
    const project = this.getArchitectProject();
    const { jsonHelp, getYargsCompletions, help } = this.context.args.options;

    const localYargs: Argv<ArchitectCommandArgs> = argv
      .positional('project', {
        describe: 'The name of the project to build. Can be an application or a library.',
        type: 'string',
        // Hide choices from JSON help so that we don't display them in AIO.
        choices: jsonHelp ? undefined : this.getProjectChoices(),
      })
      .option('configuration', {
        describe:
          `One or more named builder configurations as a comma-separated ` +
          `list as specified in the "configurations" section in angular.json.\n` +
          `The builder uses the named configurations to run the given target.\n` +
          `For more information, see https://angular.io/guide/workspace-config#alternate-build-configurations.`,
        alias: 'c',
        type: 'string',
        // Show only in when using --help and auto completion because otherwise comma seperated configuration values will be invalid.
        // Also, hide choices from JSON help so that we don't display them in AIO.
        choices:
          (getYargsCompletions || help) && !jsonHelp && project
            ? this.getConfigurationChoices(project)
            : undefined,
      })
      .strict();

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
        return this.onMissingTarget('Cannot determine project or target for command.');
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
    const { options, positional } = this.context.args;
    const [, projectName] = positional;

    if (projectName) {
      return projectName;
    }

    // Yargs allows positional args to be used as flags.
    if (typeof options['project'] === 'string') {
      return options['project'];
    }

    const target = this.getArchitectTarget();
    const projectFromTarget = this.getProjectNamesByTarget(target);

    return projectFromTarget?.length ? projectFromTarget[0] : undefined;
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
      if (maybeProject) {
        return allProjectsForTargetName.includes(maybeProject) ? [maybeProject] : undefined;
      }

      const { getYargsCompletions, help } = this.context.args.options;
      if (!getYargsCompletions && !help) {
        // Only issue the below error when not in help / completion mode.
        throw new CommandModuleError(
          'Cannot determine project for command.\n' +
            'This is a multi-project workspace and more than one project supports this command. ' +
            `Run "ng ${this.command}" to execute the command for a specific project or change the current ` +
            'working directory to a project directory.\n\n' +
            `Available projects are:\n${allProjectsForTargetName
              .sort()
              .map((p) => `- ${p}`)
              .join('\n')}`,
        );
      }
    }

    return undefined;
  }

  /** @returns a sorted list of project names to be used for auto completion. */
  private getProjectChoices(): string[] | undefined {
    const { workspace } = this.context;

    return workspace ? [...workspace.projects.keys()].sort() : undefined;
  }

  /** @returns a sorted list of configuration names to be used for auto completion. */
  private getConfigurationChoices(project: string): string[] | undefined {
    const projectDefinition = this.context.workspace?.projects.get(project);
    if (!projectDefinition) {
      return undefined;
    }

    const target = this.getArchitectTarget();
    const configurations = projectDefinition.targets.get(target)?.configurations;

    return configurations ? Object.keys(configurations).sort() : undefined;
  }
}
