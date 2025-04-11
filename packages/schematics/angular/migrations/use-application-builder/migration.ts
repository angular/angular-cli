/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  DirEntry,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  chain,
  externalSchematic,
} from '@angular-devkit/schematics';
import { basename, dirname, extname, join } from 'node:path/posix';
import { removePackageJsonDependency } from '../../utility/dependencies';
import {
  DependencyType,
  ExistingBehavior,
  InstallBehavior,
  addDependency,
} from '../../utility/dependency';
import { JSONFile } from '../../utility/json-file';
import { latestVersions } from '../../utility/latest-versions';
import {
  TargetDefinition,
  WorkspaceDefinition,
  allTargetOptions,
  allWorkspaceTargets,
  updateWorkspace,
} from '../../utility/workspace';
import { Builders, ProjectType } from '../../utility/workspace-models';
import { findImports } from './css-import-lexer';

function* updateBuildTarget(
  projectName: string,
  buildTarget: TargetDefinition,
  serverTarget: TargetDefinition | undefined,
  tree: Tree,
  context: SchematicContext,
): Iterable<Rule> {
  // Update builder target and options
  buildTarget.builder = Builders.Application;

  for (const [, options] of allTargetOptions(buildTarget, false)) {
    if (options['index'] === '') {
      options['index'] = false;
    }

    // Rename and transform options
    options['browser'] = options['main'];
    if (serverTarget && typeof options['browser'] === 'string') {
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
            media,
          };
        }
      }
    }

    // Delete removed options
    delete options['vendorChunk'];
    delete options['commonChunk'];
    delete options['resourcesOutputPath'];
    delete options['buildOptimizer'];
    delete options['main'];
    delete options['ngswConfigPath'];
  }

  // Merge browser and server tsconfig
  if (serverTarget) {
    const browserTsConfig = buildTarget.options?.tsConfig;
    const serverTsConfig = serverTarget.options?.tsConfig;

    if (typeof browserTsConfig !== 'string') {
      throw new SchematicsException(
        `Cannot update project "${projectName}" to use the application builder` +
          ` as the browser tsconfig cannot be located.`,
      );
    }

    if (typeof serverTsConfig !== 'string') {
      throw new SchematicsException(
        `Cannot update project "${projectName}" to use the application builder` +
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
    yield deleteFile(serverTsConfig);
  }

  // Update server file
  const ssrMainFile = serverTarget?.options?.['main'];
  if (typeof ssrMainFile === 'string') {
    // Do not delete the server main file if it's the same as the browser file.
    if (buildTarget.options?.browser !== ssrMainFile) {
      yield deleteFile(ssrMainFile);
    }

    yield externalSchematic('@schematics/angular', 'ssr', {
      project: projectName,
    });
  }
}

function updateProjects(tree: Tree, context: SchematicContext) {
  return updateWorkspace((workspace) => {
    const rules: Rule[] = [];

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

      const serverTarget = project.targets.get('server');

      rules.push(...updateBuildTarget(name, buildTarget, serverTarget, tree, context));

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

      // Update CSS/Sass import specifiers
      const projectSourceRoot = join(project.root, project.sourceRoot ?? 'src');
      updateStyleImports(tree, projectSourceRoot, buildTarget);
    }

    // Check for @angular-devkit/build-angular Webpack usage
    let hasAngularDevkitUsage = false;
    for (const [, target] of allWorkspaceTargets(workspace)) {
      switch (target.builder) {
        case Builders.Application:
        case Builders.DevServer:
        case Builders.ExtractI18n:
        case Builders.Karma:
        case Builders.NgPackagr:
          // Ignore application, dev server, and i18n extraction for devkit usage check.
          // Both will be replaced if no other usage is found.
          continue;
      }

      if (target.builder.startsWith('@angular-devkit/build-angular:')) {
        hasAngularDevkitUsage = true;
        break;
      }
    }

    // Use @angular/build directly if there is no devkit package usage
    if (!hasAngularDevkitUsage) {
      for (const [, target] of allWorkspaceTargets(workspace)) {
        switch (target.builder) {
          case Builders.Application:
            target.builder = '@angular/build:application';
            break;
          case Builders.DevServer:
            target.builder = '@angular/build:dev-server';
            break;
          case Builders.ExtractI18n:
            target.builder = '@angular/build:extract-i18n';
            break;
          case Builders.Karma:
            target.builder = '@angular/build:karma';
            // Remove "builderMode" option since the builder will always use "application"
            for (const [, karmaOptions] of allTargetOptions(target)) {
              delete karmaOptions['builderMode'];
            }
            break;
          case Builders.NgPackagr:
            target.builder = '@angular/build:ng-packagr';
            break;
        }
      }

      // Add direct @angular/build dependencies and remove @angular-devkit/build-angular
      rules.push(
        addDependency('@angular/build', latestVersions.DevkitBuildAngular, {
          type: DependencyType.Dev,
          // Always is set here since removePackageJsonDependency below does not automatically
          // trigger the package manager execution.
          install: InstallBehavior.Always,
          existing: ExistingBehavior.Replace,
        }),
      );
      removePackageJsonDependency(tree, '@angular-devkit/build-angular');

      // Add less dependency if any projects contain a Less stylesheet file.
      // This check does not consider Node.js packages due to the performance
      // cost of searching such a large directory structure. A build time error
      // will provide instructions to install the package in this case.
      if (hasLessStylesheets(tree)) {
        rules.push(
          addDependency('less', latestVersions['less'], {
            type: DependencyType.Dev,
            existing: ExistingBehavior.Skip,
          }),
        );
      }

      // Add postcss dependency if any projects have a custom postcss configuration file.
      // The build system only supports files in a project root or workspace root with
      // names of either 'postcss.config.json' or '.postcssrc.json'.
      if (hasPostcssConfiguration(tree, workspace)) {
        rules.push(
          addDependency('postcss', latestVersions['postcss'], {
            type: DependencyType.Dev,
            existing: ExistingBehavior.Replace,
          }),
        );
      }
    }

    return chain(rules);
  });
}

/**
 * Searches the schematic tree for files that have a `.less` extension.
 *
 * @param tree A Schematics tree instance to search
 * @returns true if Less stylesheet files are found; otherwise, false
 */
function hasLessStylesheets(tree: Tree) {
  const directories = [tree.getDir('/')];

  let current;
  while ((current = directories.pop())) {
    for (const path of current.subfiles) {
      if (path.endsWith('.less')) {
        return true;
      }
    }

    for (const path of current.subdirs) {
      if (path === 'node_modules' || path.startsWith('.')) {
        continue;
      }
      directories.push(current.dir(path));
    }
  }
}

/**
 * Searches for a Postcss configuration file within the workspace root
 * or any of the project roots.
 *
 * @param tree A Schematics tree instance to search
 * @param workspace A Workspace to check for projects
 * @returns true, if a Postcss configuration file is found; otherwise, false
 */
function hasPostcssConfiguration(tree: Tree, workspace: WorkspaceDefinition) {
  // Add workspace root
  const searchDirectories = [''];

  // Add each project root
  for (const { root } of workspace.projects.values()) {
    if (root) {
      searchDirectories.push(root);
    }
  }

  return searchDirectories.some(
    (dir) =>
      tree.exists(join(dir, 'postcss.config.json')) || tree.exists(join(dir, '.postcssrc.json')),
  );
}

function* visit(
  directory: DirEntry,
): IterableIterator<[fileName: string, contents: string, sass: boolean]> {
  for (const path of directory.subfiles) {
    const sass = path.endsWith('.scss');
    if (path.endsWith('.css') || sass) {
      const entry = directory.file(path);
      if (entry) {
        const content = entry.content;

        yield [entry.path, content.toString(), sass];
      }
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visit(directory.dir(path));
  }
}

// Based on https://github.com/sass/dart-sass/blob/44d6bb6ac72fe6b93f5bfec371a1fffb18e6b76d/lib/src/importer/utils.dart
function* potentialSassImports(
  specifier: string,
  base: string,
  fromImport: boolean,
): Iterable<string> {
  const directory = join(base, dirname(specifier));
  const extension = extname(specifier);
  const hasStyleExtension = extension === '.scss' || extension === '.sass' || extension === '.css';
  // Remove the style extension if present to allow adding the `.import` suffix
  const filename = basename(specifier, hasStyleExtension ? extension : undefined);

  if (hasStyleExtension) {
    if (fromImport) {
      yield join(directory, filename + '.import' + extension);
      yield join(directory, '_' + filename + '.import' + extension);
    }
    yield join(directory, filename + extension);
    yield join(directory, '_' + filename + extension);
  } else {
    if (fromImport) {
      yield join(directory, filename + '.import.scss');
      yield join(directory, filename + '.import.sass');
      yield join(directory, filename + '.import.css');
      yield join(directory, '_' + filename + '.import.scss');
      yield join(directory, '_' + filename + '.import.sass');
      yield join(directory, '_' + filename + '.import.css');
    }
    yield join(directory, filename + '.scss');
    yield join(directory, filename + '.sass');
    yield join(directory, filename + '.css');
    yield join(directory, '_' + filename + '.scss');
    yield join(directory, '_' + filename + '.sass');
    yield join(directory, '_' + filename + '.css');
  }
}

function updateStyleImports(tree: Tree, projectSourceRoot: string, buildTarget: TargetDefinition) {
  const external = new Set<string>();
  let needWorkspaceIncludePath = false;
  for (const file of visit(tree.getDir(projectSourceRoot))) {
    const [path, content, sass] = file;
    const relativeBase = dirname(path);

    let updater;
    for (const { start, specifier, fromUse } of findImports(content, sass)) {
      if (specifier[0] === '~') {
        updater ??= tree.beginUpdate(path);
        // start position includes the opening quote
        updater.remove(start + 1, 1);
      } else if (specifier[0] === '^') {
        updater ??= tree.beginUpdate(path);
        // start position includes the opening quote
        updater.remove(start + 1, 1);
        // Add to externalDependencies
        external.add(specifier.slice(1));
      } else if (
        sass &&
        [...potentialSassImports(specifier, relativeBase, !fromUse)].every(
          (v) => !tree.exists(v),
        ) &&
        [...potentialSassImports(specifier, '/', !fromUse)].some((v) => tree.exists(v))
      ) {
        needWorkspaceIncludePath = true;
      }
    }
    if (updater) {
      tree.commitUpdate(updater);
    }
  }

  if (needWorkspaceIncludePath) {
    buildTarget.options ??= {};
    buildTarget.options['stylePreprocessorOptions'] ??= {};
    ((buildTarget.options['stylePreprocessorOptions'] as { includePaths?: string[] })[
      'includePaths'
    ] ??= []).push('.');
  }

  if (external.size > 0) {
    buildTarget.options ??= {};
    ((buildTarget.options['externalDependencies'] as string[] | undefined) ??= []).push(
      ...external,
    );
  }
}

function deleteFile(path: string): Rule {
  return (tree) => {
    tree.delete(path);
  };
}

function updateJsonFile(path: string, updater: (json: JSONFile) => void): Rule {
  return (tree, ctx) => {
    if (tree.exists(path)) {
      updater(new JSONFile(tree, path));
    } else {
      ctx.logger.info(`Skipping updating '${path}' as it does not exist.`);
    }
  };
}

/**
 * Migration main entrypoint
 */
export default function (): Rule {
  return chain([
    updateProjects,
    // Delete package.json helper scripts
    updateJsonFile('package.json', (pkgJson) =>
      ['build:ssr', 'dev:ssr', 'serve:ssr', 'prerender'].forEach((s) =>
        pkgJson.remove(['scripts', s]),
      ),
    ),
    // Update main tsconfig
    updateJsonFile('tsconfig.json', (rootJson) => {
      rootJson.modify(['compilerOptions', 'esModuleInterop'], true);
      rootJson.modify(['compilerOptions', 'downlevelIteration'], undefined);
      rootJson.modify(['compilerOptions', 'allowSyntheticDefaultImports'], undefined);
    }),
  ]);
}
