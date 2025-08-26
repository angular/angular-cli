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
import assert from 'node:assert';
import { join } from 'node:path/posix';
import {
  DependencyType,
  ExistingBehavior,
  ProjectDefinition,
  addDependency,
  updateWorkspace,
} from '../utility';
import { latestVersions } from '../utility/latest-versions';
import { createProjectSchematic } from '../utility/project';

const TAILWIND_DEPENDENCIES = ['tailwindcss', '@tailwindcss/postcss', 'postcss'];

function addTailwindStyles(options: { project: string }, project: ProjectDefinition): Rule {
  return async (tree) => {
    const buildTarget = project.targets.get('build');

    if (!buildTarget) {
      throw new SchematicsException(`Project "${options.project}" does not have a build target.`);
    }

    const styles = buildTarget.options?.['styles'] as (string | { input: string })[] | undefined;

    let stylesheetPath: string | undefined;
    if (styles) {
      stylesheetPath = styles
        .map((s) => (typeof s === 'string' ? s : s.input))
        .find((p) => p.endsWith('.css'));
    }

    if (!stylesheetPath) {
      const newStylesheetPath = join(project.sourceRoot ?? 'src', 'tailwind.css');
      tree.create(newStylesheetPath, '@import "tailwindcss";\n');

      return updateWorkspace((workspace) => {
        const project = workspace.projects.get(options.project);
        if (project) {
          const buildTarget = project.targets.get('build');
          assert(buildTarget, 'Build target should still be present');

          // Update main styles
          const buildOptions = buildTarget.options;
          assert(buildOptions, 'Build options should still be present');
          const existingStyles = (buildOptions['styles'] as (string | { input: string })[]) ?? [];
          buildOptions['styles'] = [newStylesheetPath, ...existingStyles];

          // Update configuration styles
          if (buildTarget.configurations) {
            for (const config of Object.values(buildTarget.configurations)) {
              if (config && 'styles' in config) {
                const existingStyles = (config['styles'] as (string | { input: string })[]) ?? [];
                config['styles'] = [newStylesheetPath, ...existingStyles];
              }
            }
          }
        }
      });
    } else {
      let stylesheetContent = tree.readText(stylesheetPath);
      if (!stylesheetContent.includes('@import "tailwindcss";')) {
        stylesheetContent += '\n@import "tailwindcss";\n';
        tree.overwrite(stylesheetPath, stylesheetContent);
      }
    }
  };
}

export default createProjectSchematic((options, { project }) => {
  const templateSource = apply(url('./files'), [
    applyTemplates({
      ...strings,
      ...options,
    }),
    move(project.root),
  ]);

  return chain([
    addTailwindStyles(options, project),
    mergeWith(templateSource),
    ...TAILWIND_DEPENDENCIES.map((name) =>
      addDependency(name, latestVersions[name], {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
      }),
    ),
  ]);
});
