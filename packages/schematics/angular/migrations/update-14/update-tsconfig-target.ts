/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule } from '@angular-devkit/schematics';
import { JSONFile } from '../../utility/json-file';
import { getWorkspace } from '../../utility/workspace';
import { Builders } from '../../utility/workspace-models';

/** Migration to update tsconfig compilation target option to es2020. */
export default function (): Rule {
  return async (host) => {
    /** Builders for which the migration will run. */
    const supportedBuilders = [Builders.Karma, Builders.NgPackagr, Builders.Browser];

    /** Compilation targets values that should not be amended. */
    const skipTargets = ['es2020', 'es2021', 'es2022', 'esnext'];

    const uniqueTsConfigs = new Set(['/tsconfig.json']);

    // Find all tsconfig files which are refereced by the builders.
    const workspace = await getWorkspace(host);
    for (const project of workspace.projects.values()) {
      for (const target of project.targets.values()) {
        if (!supportedBuilders.includes(target.builder as Builders)) {
          // Unknown builder.
          continue;
        }

        // Update all other known CLI builders that use a tsconfig.
        const allOptions = [target.options ?? {}, ...Object.values(target.configurations ?? {})];
        for (const opt of allOptions) {
          if (typeof opt?.tsConfig === 'string') {
            uniqueTsConfigs.add(opt.tsConfig);
          }
        }
      }
    }

    // Modify tsconfig files
    const targetJsonPath = ['compilerOptions', 'target'];
    for (const tsConfigPath of uniqueTsConfigs) {
      const json = new JSONFile(host, tsConfigPath);
      const target = json.get(targetJsonPath);

      // Update compilation target when it's current set lower than es2020.
      if (typeof target === 'string' && !skipTargets.includes(target.toLowerCase())) {
        json.modify(targetJsonPath, 'es2020');
      }
    }
  };
}
