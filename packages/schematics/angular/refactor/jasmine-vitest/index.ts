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
} from '@angular-devkit/schematics';
import { ProjectDefinition, getWorkspace } from '../../utility/workspace';
import { Schema } from './schema';
import { transformJasmineToVitest } from './test-file-transformer';
import { RefactorReporter } from './utils/refactor-reporter';

async function getProjectRoot(tree: Tree, projectName: string | undefined): Promise<string> {
  const workspace = await getWorkspace(tree);

  let project: ProjectDefinition | undefined;
  if (projectName) {
    project = workspace.projects.get(projectName);
    if (!project) {
      throw new SchematicsException(`Project "${projectName}" not found.`);
    }
  } else {
    if (workspace.projects.size === 1) {
      project = workspace.projects.values().next().value;
    } else {
      const projectNames = Array.from(workspace.projects.keys());
      throw new SchematicsException(
        `Multiple projects found: [${projectNames.join(', ')}]. Please specify a project name.`,
      );
    }
  }

  if (!project) {
    // This case should theoretically not be hit due to the checks above, but it's good for type safety.
    throw new SchematicsException('Could not determine a project.');
  }

  return project.root;
}

const DIRECTORIES_TO_SKIP = new Set(['node_modules', '.git', 'dist', '.angular']);

function findTestFiles(directory: DirEntry, fileSuffix: string): string[] {
  const files: string[] = [];
  const stack: DirEntry[] = [directory];

  let current: DirEntry | undefined;
  while ((current = stack.pop())) {
    for (const path of current.subfiles) {
      if (path.endsWith(fileSuffix)) {
        files.push(current.path + '/' + path);
      }
    }

    for (const path of current.subdirs) {
      if (DIRECTORIES_TO_SKIP.has(path)) {
        continue;
      }
      stack.push(current.dir(path));
    }
  }

  return files;
}

export default function (options: Schema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const reporter = new RefactorReporter(context.logger);
    const projectRoot = await getProjectRoot(tree, options.project);
    const fileSuffix = options.fileSuffix ?? '.spec.ts';

    const files = findTestFiles(tree.getDir(projectRoot), fileSuffix);

    if (files.length === 0) {
      throw new SchematicsException(
        `No files ending with '${fileSuffix}' found in project '${options.project}'.`,
      );
    }

    for (const file of files) {
      reporter.incrementScannedFiles();
      const content = tree.readText(file);
      const newContent = transformJasmineToVitest(file, content, reporter);

      if (content !== newContent) {
        tree.overwrite(file, newContent);
        reporter.incrementTransformedFiles();
      }
    }

    reporter.printSummary(options.verbose);
  };
}
