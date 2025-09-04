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
  InstallBehavior,
  ProjectDefinition,
  addDependency,
  updateWorkspace,
} from '../utility';
import { JSONFile } from '../utility/json-file';
import { latestVersions } from '../utility/latest-versions';
import { createProjectSchematic } from '../utility/project';
import { Schema as TailwindOptions } from './schema';

const TAILWIND_DEPENDENCIES = ['tailwindcss', '@tailwindcss/postcss', 'postcss'];
const POSTCSS_CONFIG_FILES = ['.postcssrc.json', 'postcss.config.json'];

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

function managePostCssConfiguration(project: ProjectDefinition): Rule {
  return async (tree) => {
    const searchPaths = ['/', project.root]; // Workspace root and project root

    for (const path of searchPaths) {
      for (const configFile of POSTCSS_CONFIG_FILES) {
        const fullPath = join(path, configFile);
        if (tree.exists(fullPath)) {
          const postcssConfig = new JSONFile(tree, fullPath);
          const tailwindPluginPath = ['plugins', '@tailwindcss/postcss'];

          if (postcssConfig.get(tailwindPluginPath) === undefined) {
            postcssConfig.modify(tailwindPluginPath, {});
          }

          // Config found and handled
          return;
        }
      }
    }

    // No existing config found, so create one from the template
    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
      }),
      move(project.root),
    ]);

    return mergeWith(templateSource);
  };
}

export default createProjectSchematic<TailwindOptions>((options, { project }) => {
  return chain([
    addTailwindStyles(options, project),
    managePostCssConfiguration(project),
    ...TAILWIND_DEPENDENCIES.map((name) =>
      addDependency(name, latestVersions[name], {
        type: DependencyType.Dev,
        existing: ExistingBehavior.Skip,
        install: options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto,
      }),
    ),
  ]);
});
