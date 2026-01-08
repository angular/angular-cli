/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
} from '@angular-devkit/schematics';
import { join } from 'node:path/posix';
import {
  DependencyType,
  ExistingBehavior,
  InstallBehavior,
  addDependency,
} from '../utility/dependency';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { getWorkspace } from '../utility/workspace';
import { Builders } from '../utility/workspace-models';
import { Schema as VitestBrowserOptions } from './schema';

export default function (options: VitestBrowserOptions): Rule {
  return async (host: Tree, _context: SchematicContext) => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const testTarget = project.targets.get('test');
    if (testTarget?.builder !== Builders.BuildUnitTest) {
      throw new SchematicsException(
        `Project "${options.project}" does not have a "test" target with a supported builder.`,
      );
    }

    if (testTarget.options?.['runner'] === 'karma') {
      throw new SchematicsException(
        `Project "${options.project}" is configured to use Karma. ` +
          'Please migrate to Vitest before adding browser testing support.',
      );
    }

    const packageName = options.package;
    if (!packageName) {
      return;
    }

    const dependencies = [packageName];
    if (packageName === '@vitest/browser-playwright') {
      dependencies.push('playwright');
    } else if (packageName === '@vitest/browser-webdriverio') {
      dependencies.push('webdriverio');
    }

    // Update tsconfig.spec.json
    const tsConfigPath =
      (testTarget.options?.['tsConfig'] as string | undefined) ??
      join(project.root, 'tsconfig.spec.json');
    const updateTsConfigRule: Rule = (host) => {
      if (host.exists(tsConfigPath)) {
        const json = new JSONFile(host, tsConfigPath);
        const typesPath = ['compilerOptions', 'types'];
        const existingTypes = (json.get(typesPath) as string[] | undefined) ?? [];
        const newTypes = existingTypes.filter((t) => t !== 'jasmine');

        if (!newTypes.includes('vitest/globals')) {
          newTypes.push('vitest/globals');
        }

        if (packageName && !newTypes.includes(packageName)) {
          newTypes.push(packageName);
        }

        if (
          newTypes.length !== existingTypes.length ||
          newTypes.some((t, i) => t !== existingTypes[i])
        ) {
          json.modify(typesPath, newTypes);
        }
      }
    };

    return chain([
      updateTsConfigRule,
      ...dependencies.map((name) =>
        addDependency(name, latestVersions[name], {
          type: DependencyType.Dev,
          existing: ExistingBehavior.Skip,
          install: options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
        }),
      ),
    ]);
  };
}
