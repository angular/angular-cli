/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, SchematicsException, chain } from '@angular-devkit/schematics';
import { AngularBuilder, TargetDefinition, updateWorkspace } from '@schematics/angular/utility';
import { posix as path } from 'path';
import { Schema as EnvironmentOptions } from './schema';

const ENVIRONMENTS_DIRECTORY = 'environments';
const ENVIRONMENT_FILE_CONTENT = 'export const environment = {};\n';

export default function (options: EnvironmentOptions): Rule {
  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    const type = project.extensions['projectType'];
    if (type !== 'application') {
      return log(
        'error',
        'Only application project types are support by this schematic.' + type
          ? ` Project "${options.project}" has a "projectType" of "${type}".`
          : ` Project "${options.project}" has no "projectType" defined.`,
      );
    }

    const buildTarget = project.targets.get('build');
    if (!buildTarget) {
      return log(
        'error',
        `No "build" target found for project "${options.project}".` +
          ' A "build" target is required to generate environment files.',
      );
    }

    const serverTarget = project.targets.get('server');

    const sourceRoot = project.sourceRoot ?? path.join(project.root, 'src');

    // The generator needs to be iterated prior to returning to ensure all workspace changes that occur
    // within the generator are present for `updateWorkspace` when it writes the workspace file.
    return chain([
      ...generateConfigurationEnvironments(buildTarget, serverTarget, sourceRoot, options.project),
    ]);
  });
}

function createIfMissing(path: string): Rule {
  return (tree, context) => {
    if (tree.exists(path)) {
      context.logger.info(`Skipping creation of already existing environment file "${path}".`);
    } else {
      tree.create(path, ENVIRONMENT_FILE_CONTENT);
    }
  };
}

function log(type: 'info' | 'warn' | 'error', text: string): Rule {
  return (_, context) => context.logger[type](text);
}

function* generateConfigurationEnvironments(
  buildTarget: TargetDefinition,
  serverTarget: TargetDefinition | undefined,
  sourceRoot: string,
  projectName: string,
): Iterable<Rule> {
  if (!buildTarget.builder.startsWith(AngularBuilder.Browser)) {
    yield log(
      'warn',
      `"build" target found for project "${projectName}" has a third-party builder "${buildTarget.builder}".` +
        ' The generated project options may not be compatible with this builder.',
    );
  }

  if (serverTarget && !serverTarget.builder.startsWith(AngularBuilder.Server)) {
    yield log(
      'warn',
      `"server" target found for project "${projectName}" has a third-party builder "${buildTarget.builder}".` +
        ' The generated project options may not be compatible with this builder.',
    );
  }

  // Create default environment file
  const defaultFilePath = path.join(sourceRoot, ENVIRONMENTS_DIRECTORY, 'environment.ts');
  yield createIfMissing(defaultFilePath);

  const configurationEntries = [
    ...Object.entries(buildTarget.configurations ?? {}),
    ...Object.entries(serverTarget?.configurations ?? {}),
  ];

  const addedFiles = new Set<string>();
  for (const [name, configurationOptions] of configurationEntries) {
    if (!configurationOptions) {
      // Invalid configuration
      continue;
    }

    // Default configuration will use the default environment file
    if (name === buildTarget.defaultConfiguration) {
      continue;
    }

    const configurationFilePath = path.join(
      sourceRoot,
      ENVIRONMENTS_DIRECTORY,
      `environment.${name}.ts`,
    );

    // Add file replacement option entry for the configuration environment file
    const replacements = (configurationOptions['fileReplacements'] ??= []) as {
      replace: string;
      with: string;
    }[];
    const existing = replacements.find((value) => value.replace === defaultFilePath);
    if (existing) {
      if (existing.with === configurationFilePath) {
        yield log(
          'info',
          `Skipping addition of already existing file replacements option for "${defaultFilePath}" to "${configurationFilePath}".`,
        );
      } else {
        yield log(
          'warn',
          `Configuration "${name}" has a file replacements option for "${defaultFilePath}" but with a different replacement.` +
            ` Expected "${configurationFilePath}" but found "${existing.with}". This may result in unexpected build behavior.`,
        );
      }
    } else {
      replacements.push({ replace: defaultFilePath, with: configurationFilePath });
    }

    // Create configuration specific environment file if not already added
    if (!addedFiles.has(configurationFilePath)) {
      addedFiles.add(configurationFilePath);
      yield createIfMissing(configurationFilePath);
    }
  }
}
