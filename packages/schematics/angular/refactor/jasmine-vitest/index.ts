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
import { join, normalize } from 'node:path/posix';
import { ProjectDefinition, getWorkspace } from '../../utility/workspace';
import { Schema } from './schema';
import { transformJasmineToVitest } from './test-file-transformer';
import { RefactorReporter } from './utils/refactor-reporter';

async function getProject(
  tree: Tree,
  projectName: string | undefined,
): Promise<{ project: ProjectDefinition; name: string }> {
  const workspace = await getWorkspace(tree);

  if (projectName) {
    const project = workspace.projects.get(projectName);
    if (!project) {
      throw new SchematicsException(`Project "${projectName}" not found.`);
    }

    return { project, name: projectName };
  }

  if (workspace.projects.size === 1) {
    const [name, project] = Array.from(workspace.projects.entries())[0];

    return { project, name };
  }

  const projectNames = Array.from(workspace.projects.keys());
  throw new SchematicsException(
    `Multiple projects found: [${projectNames.join(', ')}]. Please specify a project name.`,
  );
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
    const { project, name: projectName } = await getProject(tree, options.project);
    const projectRoot = project.root;
    const fileSuffix = options.fileSuffix ?? '.spec.ts';

    let files: string[];
    let searchScope: string;

    if (options.include) {
      const normalizedInclude = options.include.replace(/\\/g, '/');
      const includePath = normalize(join(projectRoot, normalizedInclude));
      searchScope = options.include;

      let dirEntry: DirEntry | null = null;
      try {
        dirEntry = tree.getDir(includePath);
      } catch {
        // Path is not a directory.
      }

      // Approximation of a directory exists check
      if (dirEntry && (dirEntry.subdirs.length > 0 || dirEntry.subfiles.length > 0)) {
        // It is a directory
        files = findTestFiles(dirEntry, fileSuffix);
      } else if (tree.exists(includePath)) {
        // It is a file
        files = [includePath];
      } else {
        throw new SchematicsException(
          `The specified include path '${options.include}' does not exist.`,
        );
      }
    } else {
      searchScope = `project '${projectName}'`;
      files = findTestFiles(tree.getDir(projectRoot), fileSuffix);
    }

    if (files.length === 0) {
      throw new SchematicsException(
        `No files ending with '${fileSuffix}' found in ${searchScope}.`,
      );
    }

    for (const file of files) {
      reporter.incrementScannedFiles();
      const content = tree.readText(file);
      const newContent = transformJasmineToVitest(file, content, reporter, {
        addImports: !!options.addImports,
        browserMode: !!options.browerMode,
      });

      if (content !== newContent) {
        tree.overwrite(file, newContent);
        reporter.incrementTransformedFiles();
      }
    }

    if (options.report) {
      const reportContent = reporter.generateReportContent();
      tree.create(`jasmine-vitest-${new Date().toISOString()}.md`, reportContent);
    }

    reporter.printSummary(options.verbose);
  };
}
