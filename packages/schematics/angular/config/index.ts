/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  SchematicsException,
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  strings,
  url,
} from '@angular-devkit/schematics';
import { readFile } from 'node:fs/promises';
import { posix as path } from 'node:path';
import { relativePathToWorkspaceRoot } from '../utility/paths';
import { getWorkspace as readWorkspace, updateWorkspace } from '../utility/workspace';
import { Builders as AngularBuilder } from '../utility/workspace-models';
import { Schema as ConfigOptions, Type as ConfigType } from './schema';

const geminiFile: ContextFileInfo = { rulesName: 'GEMINI.md', directory: '.gemini' };
const copilotFile: ContextFileInfo = {
  rulesName: 'copilot-instructions.md',
  directory: '.github',
};
const claudeFile: ContextFileInfo = { rulesName: 'CLAUDE.md', directory: '.claude' };
const windsurfFile: ContextFileInfo = {
  rulesName: 'guidelines.md',
  directory: path.join('.windsurf', 'rules'),
};

// Cursor file is a bit different, it has a front matter section.
const cursorFile: ContextFileInfo = {
  rulesName: 'cursor.mdc',
  directory: path.join('.cursor', 'rules'),
  frontmatter: `---\ncontext: true\npriority: high\nscope: project\n---`,
};

const AI_TOOLS = {
  'gemini': geminiFile,
  'claude': claudeFile,
  'copilot': copilotFile,
  'cursor': cursorFile,
  'windsurf': windsurfFile,
};

export default function (options: ConfigOptions): Rule {
  switch (options.type) {
    case ConfigType.Karma:
      return addKarmaConfig(options);
    case ConfigType.Browserslist:
      return addBrowserslistConfig(options);
    case ConfigType.Ai:
      return addAiContextFile(options);
    default:
      throw new SchematicsException(`"${options.type}" is an unknown configuration file type.`);
  }
}

function addBrowserslistConfig(options: ConfigOptions): Rule {
  return async (host) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    // Read Angular's default vendored `.browserslistrc` file.
    const config = await readFile(path.join(__dirname, '.browserslistrc'), 'utf8');

    return mergeWith(
      apply(url('./files'), [
        filter((p) => p.endsWith('.browserslistrc.template')),
        applyTemplates({ config }),
        move(project.root),
      ]),
    );
  };
}

function addKarmaConfig(options: ConfigOptions): Rule {
  return updateWorkspace((workspace) => {
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    const testTarget = project.targets.get('test');
    if (!testTarget) {
      throw new SchematicsException(
        `No "test" target found for project "${options.project}".` +
          ' A "test" target is required to generate a karma configuration.',
      );
    }

    if (
      testTarget.builder !== AngularBuilder.Karma &&
      testTarget.builder !== AngularBuilder.BuildKarma
    ) {
      throw new SchematicsException(
        `Cannot add a karma configuration as builder for "test" target in project does not` +
          ` use "${AngularBuilder.Karma}" or "${AngularBuilder.BuildKarma}".`,
      );
    }

    testTarget.options ??= {};
    testTarget.options.karmaConfig = path.join(project.root, 'karma.conf.js');

    // If scoped project (i.e. "@foo/bar"), convert dir to "foo/bar".
    let folderName = options.project.startsWith('@') ? options.project.slice(1) : options.project;
    if (/[A-Z]/.test(folderName)) {
      folderName = strings.dasherize(folderName);
    }

    return mergeWith(
      apply(url('./files'), [
        filter((p) => p.endsWith('karma.conf.js.template')),
        applyTemplates({
          relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(project.root),
          folderName,
          needDevkitPlugin: testTarget.builder === AngularBuilder.Karma,
        }),
        move(project.root),
      ]),
    );
  });
}

interface ContextFileInfo {
  rulesName: string;
  directory: string;
  frontmatter?: string;
}

function addAiContextFile(options: ConfigOptions): Rule {
  const selectedTool = options.tool as keyof typeof AI_TOOLS;
  const files: ContextFileInfo[] =
    options.tool === 'all' ? Object.values(AI_TOOLS) : [AI_TOOLS[selectedTool]];

  return async (host) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.project);
    if (!project) {
      throw new SchematicsException(`Project name "${options.project}" doesn't not exist.`);
    }

    const rules = files.map(({ rulesName, directory, frontmatter }) =>
      mergeWith(
        apply(url('./files'), [
          // Keep only the single source template
          filter((p) => p.endsWith('__rulesName__.template')),
          applyTemplates({
            ...strings,
            rulesName,
            frontmatter: frontmatter ?? '',
          }),
          move(directory),
        ]),
      ),
    );

    return chain(rules);
  };
}
