/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type Rule,
  SchematicsException,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  strings,
  url,
} from '@angular-devkit/schematics';
import { DependencyType, ExistingBehavior, addDependency } from '../utility';
import { latestVersions } from '../utility/latest-versions';
import { createProjectSchematic } from '../utility/project';

const TAILWIND_DEPENDENCIES = ['tailwindcss', '@tailwindcss/postcss', 'postcss'];

function addTailwindImport(stylesheetPath: string): Rule {
  return (tree) => {
    let stylesheetText = '';

    if (tree.exists(stylesheetPath)) {
      stylesheetText = tree.readText(stylesheetPath);
      stylesheetText += '\n';
    }

    stylesheetText += '@import "tailwindcss";\n';

    tree.overwrite(stylesheetPath, stylesheetText);
  };
}

export default createProjectSchematic((options, { project }) => {
  const buildTarget = project.targets.get('build');

  if (!buildTarget) {
    throw new SchematicsException(`Project "${options.project}" does not have a build target.`);
  }

  const styles = buildTarget.options?.['styles'] as string[] | undefined;

  if (!styles || styles.length === 0) {
    throw new SchematicsException(`Project "${options.project}" does not have any global styles.`);
  }

  const stylesheetPath = styles[0];

  const templateSource = apply(url('./files'), [
    applyTemplates({
      ...strings,
      ...options,
    }),
    move(project.root),
  ]);

  return chain([
    addTailwindImport(stylesheetPath),
    mergeWith(templateSource),
    ...TAILWIND_DEPENDENCIES.map((name) =>
      addDependency(name, latestVersions[name], {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
      }),
    ),
  ]);
});
