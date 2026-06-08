/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  RuleFactory,
  SchematicsException,
  apply,
  applyTemplates,
  filter,
  mergeWith,
  move,
  strings,
  url,
} from '@angular-devkit/schematics';
import { posix as path } from 'node:path';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { createProjectSchematic } from '../utility/project';
import { updateWorkspace } from '../utility/workspace';
import { Builders as AngularBuilder } from '../utility/workspace-models';
import { Schema as ConfigOptions, Type as ConfigType } from './schema';

const configSchematic: RuleFactory<ConfigOptions> = createProjectSchematic(
  (options, { project }) => {
    switch (options.type) {
      case ConfigType.Karma:
        return addKarmaConfig(options);
      case ConfigType.Browserslist:
        return addBrowserslistConfig(project.root);
      case ConfigType.Vitest:
        return addVitestConfig(options);
      default:
        throw new SchematicsException(`"${options.type}" is an unknown configuration file type.`);
    }
  },
);

export default configSchematic;

function addVitestConfig(options: ConfigOptions): Rule {
  return (tree, context) =>
    updateWorkspace((workspace) => {
      const project = workspace.projects.get(options.project);
      if (!project) {
        throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
      }

      const testTarget = project.targets.get('test');
      if (!testTarget) {
        throw new SchematicsException(
          `No "test" target found for project "${options.project}".` +
            ' A "test" target is required to generate a Vitest configuration.',
        );
      }

      if (testTarget.builder !== AngularBuilder.BuildUnitTest) {
        throw new SchematicsException(
          `Cannot add a Vitest configuration as builder for "test" target in project does not` +
            ` use "${AngularBuilder.BuildUnitTest}".`,
        );
      }

      testTarget.options ??= {};
      testTarget.options.runnerConfig = true;

      // Check runner option.
      if (testTarget.options.runner === 'karma') {
        context.logger.warn(
          `The "test" target is configured to use the "karma" runner in the main options.` +
            ' The generated "vitest-base.config.ts" file may not be used.',
        );
      }

      for (const [name, config] of Object.entries(testTarget.configurations ?? {})) {
        if (
          config &&
          typeof config === 'object' &&
          'runner' in config &&
          config.runner === 'karma'
        ) {
          context.logger.warn(
            `The "test" target's "${name}" configuration is configured to use the "karma" runner.` +
              ' The generated "vitest-base.config.ts" file may not be used for that configuration.',
          );
        }
      }

      return mergeWith(
        apply(url('./files'), [
          filter((p) => p.endsWith('vitest-base.config.ts.template')),
          applyTemplates({}),
          move(project.root),
        ]),
      );
    });
}

async function addBrowserslistConfig(projectRoot: string): Promise<Rule> {
  return mergeWith(
    apply(url('./files'), [
      filter((p) => p.endsWith('.browserslistrc.template')),
      // The below is replaced by bazel `npm_package`.
      applyTemplates({ baselineDate: 'BASELINE-DATE-PLACEHOLDER' }),
      move(projectRoot),
    ]),
  );
}

function addKarmaConfig(options: ConfigOptions): Rule {
  return (_, context) =>
    updateWorkspace((workspace) => {
      const project = workspace.projects.get(options.project);
      if (!project) {
        throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
      }

      const testTarget = project.targets.get('test');
      if (!testTarget) {
        throw new SchematicsException(
          `No "test" target found for project "${options.project}".` +
            ' A "test" target is required to generate a karma configuration.',
        );
      }

      if (
        testTarget.builder !== AngularBuilder.Karma &&
        testTarget.builder !== AngularBuilder.BuildKarma &&
        testTarget.builder !== AngularBuilder.BuildUnitTest
      ) {
        throw new SchematicsException(
          `Cannot add a karma configuration as builder for "test" target in project does not` +
            ` use "${AngularBuilder.Karma}", "${AngularBuilder.BuildKarma}", or ${AngularBuilder.BuildUnitTest}.`,
        );
      }

      testTarget.options ??= {};
      if (testTarget.builder !== AngularBuilder.BuildUnitTest) {
        testTarget.options.karmaConfig = path.join(project.root, 'karma.conf.js');
      } else {
        // `unit-test` uses the `runnerConfig` option which has configuration discovery if enabled
        testTarget.options.runnerConfig = true;

        let isKarmaRunnerConfigured = false;
        // Check runner option
        if (testTarget.options.runner) {
          if (testTarget.options.runner === 'karma') {
            isKarmaRunnerConfigured = true;
          } else {
            context.logger.warn(
              `The "test" target is configured to use a runner other than "karma" in the main options.` +
                ' The generated "karma.conf.js" file may not be used.',
            );
          }
        }

        for (const [name, config] of Object.entries(testTarget.configurations ?? {})) {
          if (config && typeof config === 'object' && 'runner' in config) {
            if (config.runner !== 'karma') {
              context.logger.warn(
                `The "test" target's "${name}" configuration is configured to use a runner other than "karma".` +
                  ' The generated "karma.conf.js" file may not be used for that configuration.',
              );
            } else {
              isKarmaRunnerConfigured = true;
            }
          }
        }

        if (!isKarmaRunnerConfigured) {
          context.logger.warn(
            `The "test" target is not explicitly configured to use the "karma" runner.` +
              ' The generated "karma.conf.js" file may not be used as the default runner is "vitest".',
          );
        }
      }
      // If scoped project (i.e. "@foo/bar"), convert dir to "foo/bar".
      let folderName = options.project.startsWith('@') ? options.project.slice(1) : options.project;
      if (/[A-Z]/.test(folderName)) {
        folderName = strings.dasherize(folderName);
      }

      return mergeWith(
        apply(url('./files'), [
          filter((p) => p.endsWith('karma.conf.js.template')),
          applyTemplates({
            relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
            folderName,
            needDevkitPlugin: testTarget.builder === AngularBuilder.Karma,
          }),
          move(project.root),
        ]),
      );
    });
}
