/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { join, normalize, strings } from '@angular-devkit/core';
import { Rule } from '@angular-devkit/schematics';
import { getWorkspace } from '../../utility/workspace';
import { ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return async (host, context) => {
    const workspace = await getWorkspace(host);
    const logger = context.logger;

    for (const [projectName, project] of workspace.projects) {
      if (project.extensions.projectType !== ProjectType.Application) {
        // Only interested in application projects
        continue;
      }

      const appDir = join(normalize(project.sourceRoot || ''), 'app');
      const { subdirs, subfiles } = host.getDir(appDir);
      if (!subdirs.length && !subfiles.length) {
        logger.error(`Application directory '${appDir}' for project '${projectName}' doesn't exist.`);
        continue;
      }

      const pkgJson = join(appDir, 'package.json');
      if (!host.exists(pkgJson)) {
        const pkgJsonContent = {
          name: strings.dasherize(projectName),
          private: true,
          description: `This is a special package.json file that is not used by package managers. It is however used to tell the tools and bundlers whether the code under this directory is free of code with non-local side-effect. Any code that does have non-local side-effects can't be well optimized (tree-shaken) and will result in unnecessary increased payload size. It should be safe to set this option to 'false' for new applications, but existing code bases could be broken when built with the production config if the application code does contain non-local side-effects that the application depends on.`,
          sideEffects: true,
        };

        host.create(pkgJson, JSON.stringify(pkgJsonContent, undefined, 2));
      }
    }
  };
}
