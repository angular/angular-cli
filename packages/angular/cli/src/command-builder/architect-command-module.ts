/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect, Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { Argv } from 'yargs';
import { isPackageNameSafeForAnalytics } from '../analytics/analytics';
import {
  CommandModule,
  CommandModuleError,
  CommandModuleImplementation,
  CommandScope,
  Options,
  OtherOptions,
} from './command-module';
import { getArchitectTargetOptions } from './utilities/architect';

export interface ArchitectCommandArgs {
  configuration?: string;
  project?: string;
}

export abstract class ArchitectCommandModule
  extends CommandModule<ArchitectCommandArgs>
  implements CommandModuleImplementation<ArchitectCommandArgs>
{
  static override scope = CommandScope.In;
  abstract readonly multiTarget: boolean;
  readonly missingErrorTarget: string | undefined;
  protected override shouldReportAnalytics = false;

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

    const targetSpecifier = this.makeTargetSpecifier();
    if (!targetSpecifier.project) {
      return localYargs;
    }

    const schemaOptions = await getArchitectTargetOptions(this.context, targetSpecifier);

    return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
  }

  async run(options: Options<ArchitectCommandArgs>): Promise<number | void> {
    const { logger, workspace } = this.context;
    if (!workspace) {
      logger.fatal('A workspace is required for this command.');

      return 1;
    }

    const registry = new json.schema.CoreSchemaRegistry();
    registry.addPostTransform(json.schema.transforms.addUndefinedDefaults);
    registry.useXDeprecatedProvider((msg) => this.context.logger.warn(msg));

    const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath);
    const architect = new Architect(architectHost, registry);

    const targetSpec = this.makeTargetSpecifier(options);
    if (!targetSpec.project) {
      const target = this.getArchitectTarget();

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
        result |= await this.runSingleTarget({ ...targetSpec, project }, options, architect);
      }

      return result;
    } else {
      return await this.runSingleTarget(targetSpec, options, architect);
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
    // 'build [project]' -> 'build'
    return this.command?.split(' ', 1)[0];
  }

  private makeTargetSpecifier(options?: Options<ArchitectCommandArgs>): Target {
    return {
      project: options?.project ?? this.getArchitectProject() ?? '',
      target: this.getArchitectTarget(),
      configuration: options?.configuration ?? '',
    };
  }

  private getProjectNamesByTarget(target: string): string[] | undefined {
    const workspace = this.context.workspace;
    if (!workspace) {
      throw new CommandModuleError('A workspace is required for this command.');
    }

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
      // For single target commands, we try the default project first,
      // then the full list if it has a single project, then error out.
      const maybeDefaultProject = workspace.extensions['defaultProject'];
      if (
        typeof maybeDefaultProject === 'string' &&
        allProjectsForTargetName.includes(maybeDefaultProject)
      ) {
        return [maybeDefaultProject];
      }

      if (allProjectsForTargetName.length === 1) {
        return allProjectsForTargetName;
      }
    }

    return undefined;
  }

  private async runSingleTarget(
    target: Target,
    options: Options<ArchitectCommandArgs> & OtherOptions,
    architect: Architect,
  ): Promise<number> {
    // Remove options
    const { configuration, project, ...extraOptions } = options;
    const architectHost = await this.getArchitectHost();

    let builderName: string;
    try {
      builderName = await architectHost.getBuilderNameForTarget(target);
    } catch (e) {
      throw new CommandModuleError(this.missingErrorTarget ?? e.message);
    }

    await this.reportAnalytics({
      ...(await architectHost.getOptionsForTarget(target)),
      ...extraOptions,
    });

    const { logger } = this.context;

    const run = await architect.scheduleTarget(target, extraOptions as json.JsonObject, {
      logger,
      analytics: isPackageNameSafeForAnalytics(builderName) ? await this.getAnalytics() : undefined,
    });

    const { error, success } = await run.output.toPromise();
    await run.stop();

    if (error) {
      logger.error(error);
    }

    return success ? 0 : 1;
  }

  private _architectHost: WorkspaceNodeModulesArchitectHost | undefined;
  private getArchitectHost(): WorkspaceNodeModulesArchitectHost {
    if (this._architectHost) {
      return this._architectHost;
    }

    const { workspace } = this.context;
    if (!workspace) {
      throw new CommandModuleError('A workspace is required for this command.');
    }

    return (this._architectHost = new WorkspaceNodeModulesArchitectHost(
      workspace,
      workspace.basePath,
    ));
  }
}
