/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json } from '@angular-devkit/core';
import { Argv } from 'yargs';
import { ArchitectCommand } from '../../models/architect-command';
import { AngularWorkspace } from '../config';
import {
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
} from './command-module';
import { Option, addSchemaOptionsToYargs, parseJsonSchemaToOptions } from './json-schema';

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

    const workspace = this.context.workspace;
    if (!workspace) {
      return localYargs;
    }
    const targetSpecifier = this.makeTargetSpecifier();
    if (!targetSpecifier) {
      return localYargs;
    }

    const schemaOptions = await getArchitectTargetOptions(workspace, targetSpecifier);

    if (schemaOptions) {
      const { help } = this.context.args.options;

      return addSchemaOptionsToYargs(localYargs, schemaOptions, help);
    }

    return localYargs;
  }

  run(options: Options<ArchitectCommandArgs>): Promise<number | void> {
    const command = new ArchitectCommand(
      this.context,
      this.command.split(' ')[0],
      this.multiTarget,
      this.getArchitectTarget(),
      this.missingErrorTarget,
    );

    return command.validateAndRun(options);
  }

  private getArchitectProject(): string | undefined {
    const workspace = this.context.workspace;
    const target = this.getArchitectTarget();

    if (!workspace || !target) {
      return undefined;
    }

    let [, projectName] = this.context.args.positional;

    if (projectName) {
      if (!workspace.projects.has(projectName)) {
        throw new Error(`Project '${projectName}' does not exist.`);
      }

      return projectName;
    }
    const targetProjectNames: string[] = [];
    for (const [name, project] of workspace.projects) {
      if (project.targets.has(target)) {
        targetProjectNames.push(name);
      }
    }

    if (targetProjectNames.length === 0) {
      return undefined;
    }

    if (!projectName && !this.multiTarget) {
      const defaultProjectName = workspace.extensions['defaultProject'] as string;
      projectName =
        defaultProjectName && targetProjectNames.includes(defaultProjectName)
          ? defaultProjectName
          : targetProjectNames[0];
    }

    return projectName;
  }

  private getArchitectTarget(): string {
    // 'build [project]' -> 'build'
    return this.command?.split(' ', 1)[0];
  }

  private makeTargetSpecifier(options?: Options<ArchitectCommandArgs>): Target | undefined {
    const project = options?.project ?? this.getArchitectProject();
    if (!project) {
      return undefined;
    }

    return {
      project: project,
      target: this.getArchitectTarget(),
      configuration: options?.configuration ?? '',
    };
  }
}

export async function getArchitectTargetOptions(
  workspace: AngularWorkspace,
  target: Target,
): Promise<Option[] | undefined> {
  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath);
  const builderConf = await architectHost.getBuilderNameForTarget(target);

  let builderDesc;
  try {
    builderDesc = await architectHost.resolveBuilder(builderConf);
  } catch {
    return undefined;
  }

  return parseJsonSchemaToOptions(
    new json.schema.CoreSchemaRegistry(),
    builderDesc.optionSchema as json.JsonObject,
  );
}
