/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Target } from '@angular-devkit/architect';
import { WorkspaceNodeModulesArchitectHost } from '@angular-devkit/architect/node';
import { json, tags } from '@angular-devkit/core';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { Argv } from 'yargs';
import { ArchitectCommand } from '../../models/architect-command';
import { getPackageManager } from '../package-manager';
import {
  CommandContext,
  CommandModule,
  CommandModuleImplementation,
  CommandScope,
  Options,
} from './command-module';
import { Option, parseJsonSchemaToOptions } from './json-schema';

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

    const targetSpecifier = this.makeTargetSpecifier();
    if (!targetSpecifier) {
      return localYargs;
    }

    const schemaOptions = await getArchitectTargetOptions(this.context, targetSpecifier);

    return this.addSchemaOptionsToCommand(localYargs, schemaOptions);
  }

  run(options: Options<ArchitectCommandArgs>): Promise<number | void> {
    const command = new ArchitectCommand(
      this.context,
      this.getArchitectTarget(),
      this.multiTarget,
      this.getArchitectTarget(),
      this.missingErrorTarget,
    );

    return command.validateAndRun(options);
  }

  private getArchitectProject(): string | undefined {
    const workspace = this.context.workspace;
    if (!workspace) {
      return undefined;
    }

    const [, projectName] = this.context.args.positional;

    if (projectName) {
      if (!workspace.projects.has(projectName)) {
        throw new Error(`Project '${projectName}' does not exist.`);
      }

      return projectName;
    }

    const builderNames = new Set<string>();
    const targetProjectNames: string[] = [];
    const target = this.getArchitectTarget();
    for (const [name, project] of workspace.projects) {
      const projectTarget = project.targets.get(target);
      if (projectTarget) {
        targetProjectNames.push(name);

        if (this.multiTarget) {
          builderNames.add(projectTarget.builder);
        }
      }
    }

    if (targetProjectNames.length === 0) {
      return undefined;
    }

    const defaultProjectName = workspace.extensions['defaultProject'];
    if (!projectName && this.multiTarget && builderNames.size > 1) {
      throw new Error(tags.oneLine`
        Architect commands with command line overrides cannot target different builders. The
        '${target}' target would run on projects ${targetProjectNames.join()} which have the
        following builders: ${'\n  ' + [...builderNames].join('\n  ')}
      `);
    }

    return typeof defaultProjectName === 'string' && targetProjectNames.includes(defaultProjectName)
      ? defaultProjectName
      : targetProjectNames[0];
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

/**
 * Get architect target schema options.
 */
export async function getArchitectTargetOptions(
  context: CommandContext,
  target: Target,
): Promise<Option[]> {
  const { workspace, args } = context;
  if (!workspace) {
    return [];
  }

  const architectHost = new WorkspaceNodeModulesArchitectHost(workspace, workspace.basePath);
  const builderConf = await architectHost.getBuilderNameForTarget(target);

  let builderDesc;
  try {
    builderDesc = await architectHost.resolveBuilder(builderConf);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      await warnOnMissingNodeModules(context);
      throw new Error(`Could not find the '${builderConf}' builder's node package.`);
    }

    throw e;
  }

  return parseJsonSchemaToOptions(
    new json.schema.CoreSchemaRegistry(),
    builderDesc.optionSchema as json.JsonObject,
    args.options.interactive !== false,
  );
}

export async function warnOnMissingNodeModules(context: CommandContext): Promise<void> {
  const basePath = context.workspace?.basePath;
  if (!basePath) {
    return;
  }

  // Check for a `node_modules` directory (npm, yarn non-PnP, etc.)
  if (existsSync(resolve(basePath, 'node_modules'))) {
    return;
  }

  // Check for yarn PnP files
  if (
    existsSync(resolve(basePath, '.pnp.js')) ||
    existsSync(resolve(basePath, '.pnp.cjs')) ||
    existsSync(resolve(basePath, '.pnp.mjs'))
  ) {
    return;
  }

  const packageManager = await getPackageManager(basePath);
  context.logger.warn(
    `Node packages may not be installed. Try installing with '${packageManager} install'.`,
  );
}
