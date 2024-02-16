/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { workspaces } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  SchematicsException,
  chain,
  externalSchematic,
} from '@angular-devkit/schematics';
import { dirname, join } from 'node:path/posix';
import { JSONFile } from '../../utility/json-file';
import { TreeWorkspaceHost, allTargetOptions, getWorkspace } from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';

export default function (): Rule {
  return async (tree, context) => {
    const rules: Rule[] = [];
    const workspace = await getWorkspace(tree);

    for (const [name, project] of workspace.projects) {
      if (project.extensions.projectType !== ProjectType.Application) {
        // Only interested in application projects since these changes only effects application builders
        continue;
      }

      const buildTarget = project.targets.get('build');
      if (!buildTarget || buildTarget.builder === Builders.Application) {
        continue;
      }

      if (
        buildTarget.builder !== Builders.BrowserEsbuild &&
        buildTarget.builder !== Builders.Browser
      ) {
        context.logger.error(
          `Cannot update project "${name}" to use the application builder.` +
            ` Only "${Builders.BrowserEsbuild}" and "${Builders.Browser}" can be automatically migrated.`,
        );

        continue;
      }

      // Update builder target and options
      buildTarget.builder = Builders.Application;
      const hasServerTarget = project.targets.has('server');

      for (const [, options] of allTargetOptions(buildTarget, false)) {
        // Show warnings for using no longer supported options
        if (usesNoLongerSupportedOptions(options, context, name)) {
          continue;
        }

        if (options['index'] === '') {
          options['index'] = false;
        }

        // Rename and transform options
        options['browser'] = options['main'];
        if (hasServerTarget && typeof options['browser'] === 'string') {
          options['server'] = dirname(options['browser']) + '/main.server.ts';
        }
        options['serviceWorker'] = options['ngswConfigPath'] ?? options['serviceWorker'];

        if (typeof options['polyfills'] === 'string') {
          options['polyfills'] = [options['polyfills']];
        }

        let outputPath = options['outputPath'];
        if (typeof outputPath === 'string') {
          if (!/\/browser\/?$/.test(outputPath)) {
            // TODO: add prompt.
            context.logger.warn(
              `The output location of the browser build has been updated from "${outputPath}" to ` +
                `"${join(outputPath, 'browser')}". ` +
                'You might need to adjust your deployment pipeline or, as an alternative, ' +
                'set outputPath.browser to "" in order to maintain the previous functionality.',
            );
          } else {
            outputPath = outputPath.replace(/\/browser\/?$/, '');
          }

          options['outputPath'] = {
            base: outputPath,
          };

          if (typeof options['resourcesOutputPath'] === 'string') {
            const media = options['resourcesOutputPath'].replaceAll('/', '');
            if (media && media !== 'media') {
              options['outputPath'] = {
                base: outputPath,
                media: media,
              };
            }
          }
        }

        // Delete removed options
        delete options['deployUrl'];
        delete options['vendorChunk'];
        delete options['commonChunk'];
        delete options['resourcesOutputPath'];
        delete options['buildOptimizer'];
        delete options['main'];
        delete options['ngswConfigPath'];
      }

      // Merge browser and server tsconfig
      if (hasServerTarget) {
        const browserTsConfig = buildTarget?.options?.tsConfig;
        const serverTsConfig = project.targets.get('server')?.options?.tsConfig;

        if (typeof browserTsConfig !== 'string') {
          throw new SchematicsException(
            `Cannot update project "${name}" to use the application builder` +
              ` as the browser tsconfig cannot be located.`,
          );
        }

        if (typeof serverTsConfig !== 'string') {
          throw new SchematicsException(
            `Cannot update project "${name}" to use the application builder` +
              ` as the server tsconfig cannot be located.`,
          );
        }

        const browserJson = new JSONFile(tree, browserTsConfig);
        const serverJson = new JSONFile(tree, serverTsConfig);

        const filesPath = ['files'];

        const files = new Set([
          ...((browserJson.get(filesPath) as string[] | undefined) ?? []),
          ...((serverJson.get(filesPath) as string[] | undefined) ?? []),
        ]);

        // Server file will be added later by the means of the ssr schematic.
        files.delete('server.ts');

        browserJson.modify(filesPath, Array.from(files));

        const typesPath = ['compilerOptions', 'types'];
        browserJson.modify(
          typesPath,
          Array.from(
            new Set([
              ...((browserJson.get(typesPath) as string[] | undefined) ?? []),
              ...((serverJson.get(typesPath) as string[] | undefined) ?? []),
            ]),
          ),
        );

        // Delete server tsconfig
        tree.delete(serverTsConfig);
      }

      // Update main tsconfig
      const rootJson = new JSONFile(tree, 'tsconfig.json');
      rootJson.modify(['compilerOptions', 'esModuleInterop'], true);
      rootJson.modify(['compilerOptions', 'downlevelIteration'], undefined);
      rootJson.modify(['compilerOptions', 'allowSyntheticDefaultImports'], undefined);

      // Update server file
      const ssrMainFile = project.targets.get('server')?.options?.['main'];
      if (typeof ssrMainFile === 'string') {
        tree.delete(ssrMainFile);

        rules.push(
          externalSchematic('@schematics/angular', 'ssr', {
            project: name,
            skipInstall: true,
          }),
        );
      }

      // Delete package.json helper scripts
      const pkgJson = new JSONFile(tree, 'package.json');
      ['build:ssr', 'dev:ssr', 'serve:ssr', 'prerender'].forEach((s) =>
        pkgJson.remove(['scripts', s]),
      );

      // Delete all redundant targets
      for (const [key, target] of project.targets) {
        switch (target.builder) {
          case Builders.Server:
          case Builders.Prerender:
          case Builders.AppShell:
          case Builders.SsrDevServer:
            project.targets.delete(key);
            break;
        }
      }
    }

    // Save workspace changes
    await workspaces.writeWorkspace(workspace, new TreeWorkspaceHost(tree));

    return chain(rules);
  };
}

function usesNoLongerSupportedOptions(
  { deployUrl, resourcesOutputPath }: Record<string, unknown>,
  context: SchematicContext,
  projectName: string,
): boolean {
  let hasUsage = false;
  if (typeof deployUrl === 'string') {
    hasUsage = true;
    context.logger.warn(
      `Skipping migration for project "${projectName}". "deployUrl" option is not available in the application builder.`,
    );
  }

  return hasUsage;
}
