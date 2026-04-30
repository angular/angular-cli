/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { json } from '@angular-devkit/core';
import { Rule, SchematicContext, Tree, chain } from '@angular-devkit/schematics';
import { isDeepStrictEqual } from 'util';
import { DependencyType, ExistingBehavior, addDependency } from '../../utility/dependency';
import { latestVersions } from '../../utility/latest-versions';
import { TargetDefinition, allTargetOptions, updateWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';
import { BUILD_OPTIONS_KEYS } from './constants';
import { KarmaConfigProcessingResult, processKarmaConfig } from './karma-processor';

async function processTestTargetOptions(
  testTarget: TargetDefinition,
  projectName: string,
  context: SchematicContext,
  tree: Tree,
  removableKarmaConfigs: Map<string, KarmaConfigProcessingResult>,
  customBuildOptions: Record<string, Record<string, json.JsonValue | undefined>>,
  needDevkitPlugin: boolean,
  manualMigrationFiles: string[],
): Promise<boolean> {
  let needsCoverage = false;
  for (const [configName, options] of allTargetOptions(testTarget, false)) {
    const configKey = configName || '';
    if (!customBuildOptions[configKey]) {
      // Match Karma behavior where AOT was disabled by default
      customBuildOptions[configKey] = {
        aot: false,
        optimization: false,
        extractLicenses: false,
      };
    }

    // Collect custom build options
    for (const key of BUILD_OPTIONS_KEYS) {
      if (options[key] !== undefined) {
        customBuildOptions[configKey][key] = options[key];
        delete options[key];
      }
    }

    // Map Karma options to Unit-Test options
    if (options['codeCoverage'] !== undefined) {
      options['coverage'] = options['codeCoverage'];
      delete options['codeCoverage'];
    }

    if (options['codeCoverageExclude'] !== undefined) {
      options['coverageExclude'] = options['codeCoverageExclude'];
      delete options['codeCoverageExclude'];
    }

    if (options['coverage'] === true || options['coverageExclude'] !== undefined) {
      needsCoverage = true;
    }

    if (options['sourceMap'] !== undefined) {
      context.logger.info(
        `Project "${projectName}" has "sourceMap" set for tests. ` +
          `In unit-test builder with Vitest, source maps are always enabled. The option has been removed.`,
      );
      delete options['sourceMap'];
    }

    // Convert browser list to array format if it is a comma-separated string
    const browsers = options['browsers'];
    if (typeof browsers === 'string') {
      options['browsers'] = browsers.split(',').map((b) => b.trim());
    } else if (browsers === false) {
      options['browsers'] = [];
    }

    const updatedBrowsers = options['browsers'];
    if (Array.isArray(updatedBrowsers) && updatedBrowsers.length > 0) {
      context.logger.info(
        `Project "${projectName}" has browsers configured for tests. ` +
          `To run tests in a browser with Vitest, you will need to install either ` +
          `"@vitest/browser-playwright" or "@vitest/browser-webdriverio" depending on your preference.`,
      );
    }

    // Check if the karma configuration file can be safely removed and extract settings
    const karmaConfig = options['karmaConfig'];
    if (typeof karmaConfig === 'string') {
      await processKarmaConfig(
        karmaConfig,
        options,
        projectName,
        context,
        tree,
        removableKarmaConfigs,
        needDevkitPlugin,
        manualMigrationFiles,
      );
    }

    // Map the main entry file to the setupFiles of the unit-test builder
    const mainFile = options['main'];
    if (typeof mainFile === 'string') {
      options['setupFiles'] = [mainFile];

      context.logger.info(
        `Project "${projectName}" uses a "main" entry file for tests: "${mainFile}". ` +
          `This has been mapped to the unit-test builder "setupFiles" array. ` +
          `Please ensure you remove any TestBed.initTestEnvironment calls from this file ` +
          `as the builder now handles test environment initialization automatically.`,
      );
    }
    delete options['main'];
  }

  return needsCoverage;
}

function updateProjects(tree: Tree, context: SchematicContext): Rule {
  return updateWorkspace(async (workspace) => {
    let needsCoverage = false;
    const removableKarmaConfigs = new Map<string, KarmaConfigProcessingResult>();
    const migratedProjects: string[] = [];
    const skippedNonApplications: string[] = [];
    const skippedMissingAppBuilder: string[] = [];
    const manualMigrationFiles: string[] = [];

    for (const [projectName, project] of workspace.projects) {
      // Restrict to application types for now
      if (project.extensions.projectType !== 'application') {
        skippedNonApplications.push(projectName);
        continue;
      }

      // Check if build target uses the new application builder
      const buildTarget = project.targets.get('build');
      if (!buildTarget || buildTarget.builder !== '@angular/build:application') {
        context.logger.info(
          `Project "${projectName}" cannot be migrated to Vitest yet. ` +
            `The project must first be migrated to use the "@angular/build:application" builder.`,
        );
        skippedMissingAppBuilder.push(projectName);
        continue;
      }

      // Find the test target to migrate
      const testTarget = project.targets.get('test');
      if (!testTarget) {
        continue;
      }

      let isKarma = false;
      let needDevkitPlugin = false;
      // Check if target uses Karma builders
      switch (testTarget.builder) {
        case Builders.Karma:
          isKarma = true;
          needDevkitPlugin = true;
          break;
        case Builders.BuildKarma:
          isKarma = true;
          break;
      }

      if (!isKarma) {
        continue;
      }

      // Store custom build options to move to a new build configuration if needed
      const customBuildOptions: Record<string, Record<string, json.JsonValue | undefined>> = {};

      const projectNeedsCoverage = await processTestTargetOptions(
        testTarget,
        projectName,
        context,
        tree,
        removableKarmaConfigs,
        customBuildOptions,
        needDevkitPlugin,
        manualMigrationFiles,
      );

      if (projectNeedsCoverage) {
        needsCoverage = true;
      }

      // If we have custom build options, create testing configurations
      const baseOptions = buildTarget.options || {};

      for (const [configKey, configOptions] of Object.entries(customBuildOptions)) {
        const finalConfig: Record<string, json.JsonValue | undefined> = {};

        // Omit options that already have the same value in the base build options.
        // Using isDeepStrictEqual for a deep comparison of arrays and objects.
        for (const [key, value] of Object.entries(configOptions)) {
          if (!isDeepStrictEqual(value, baseOptions[key])) {
            finalConfig[key] = value;
          }
        }

        if (Object.keys(finalConfig).length > 0) {
          buildTarget.configurations ??= {};
          const configurations = buildTarget.configurations;

          let configName = configKey ? `testing-${configKey}` : 'testing';
          if (configurations[configName]) {
            let counter = 1;
            while (configurations[`${configName}-${counter}`]) {
              counter++;
            }
            configName = `${configName}-${counter}`;
          }

          configurations[configName] = finalConfig;

          if (configKey === '') {
            testTarget.options ??= {};
            testTarget.options['buildTarget'] = `:build:${configName}`;
          } else {
            testTarget.configurations ??= {};
            testTarget.configurations[configKey] ??= {};
            testTarget.configurations[configKey]['buildTarget'] = `:build:${configName}`;
          }
        }
      }

      // Update builder
      testTarget.builder = '@angular/build:unit-test';
      testTarget.options ??= {};
      testTarget.options['runner'] = 'vitest';

      migratedProjects.push(projectName);
    }

    // Perform cleanup of removable karma config files
    for (const [configPath, result] of removableKarmaConfigs) {
      if (result.isRemovable && tree.exists(configPath)) {
        tree.delete(configPath);
      }
    }

    // Log summary
    context.logger.info('\n--- Karma to Vitest Migration Summary ---');
    context.logger.info(`Projects migrated: ${migratedProjects.length}`);
    if (migratedProjects.length > 0) {
      context.logger.info(`  - ${migratedProjects.join(', ')}`);
    }
    context.logger.info(`Projects skipped (non-applications): ${skippedNonApplications.length}`);
    if (skippedNonApplications.length > 0) {
      context.logger.info(`  - ${skippedNonApplications.join(', ')}`);
    }
    context.logger.info(
      `Projects skipped (missing application builder): ${skippedMissingAppBuilder.length}`,
    );
    if (skippedMissingAppBuilder.length > 0) {
      context.logger.info(`  - ${skippedMissingAppBuilder.join(', ')}`);
    }

    const uniqueManualFiles = [...new Set(manualMigrationFiles)];
    if (uniqueManualFiles.length > 0) {
      context.logger.warn(`\nThe following Karma configuration files require manual migration:`);
      for (const file of uniqueManualFiles) {
        context.logger.warn(`  - ${file}`);
      }
    }
    if (migratedProjects.length > 0) {
      context.logger.info(
        `\nNote: To refactor your test files from Jasmine to Vitest, consider running the following command:` +
          `\n  ng g @schematics/angular:refactor-jasmine-vitest <project_name>`,
      );
    }
    context.logger.info('-----------------------------------------\n');

    if (migratedProjects.length > 0) {
      const rules = [
        addDependency('vitest', latestVersions['vitest'], {
          type: DependencyType.Dev,
          existing: ExistingBehavior.Skip,
        }),
      ];

      if (needsCoverage) {
        rules.push(
          addDependency('@vitest/coverage-v8', latestVersions['@vitest/coverage-v8'], {
            type: DependencyType.Dev,
            existing: ExistingBehavior.Skip,
          }),
        );
      }

      return chain(rules);
    }
  });
}

export default function (): Rule {
  return updateProjects;
}
