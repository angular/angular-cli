/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Rule,
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  strings,
  url,
} from '@angular-devkit/schematics';
import { Schema as ConfigOptions, Tool } from './schema';

const AI_TOOLS: { [key in Exclude<Tool, Tool.None>]: ContextFileInfo } = {
  gemini: {
    rulesName: 'GEMINI.md',
    directory: '.gemini',
  },
  claude: {
    rulesName: 'CLAUDE.md',
    directory: '.claude',
  },
  copilot: {
    rulesName: 'copilot-instructions.md',
    directory: '.github',
  },
  windsurf: {
    rulesName: 'guidelines.md',
    directory: '.windsurf/rules',
  },
  jetbrains: {
    rulesName: 'guidelines.md',
    directory: '.junie',
  },
  // Cursor file has a front matter section.
  cursor: {
    rulesName: 'cursor.mdc',
    directory: '.cursor/rules',
    frontmatter: `---\ncontext: true\npriority: high\nscope: project\n---`,
  },
};

interface ContextFileInfo {
  rulesName: string;
  directory: string;
  frontmatter?: string;
}

export default function ({ tool }: ConfigOptions): Rule {
  return (tree, context) => {
    if (!tool) {
      return noop();
    }

    const rules = tool
      .filter((tool) => tool !== Tool.None)
      .map((selectedTool) => {
        const { rulesName, directory, frontmatter } = AI_TOOLS[selectedTool];
        const path = `${directory}/${rulesName}`;

        if (tree.exists(path)) {
          const toolName = strings.classify(selectedTool);
          context.logger.warn(
            `Skipping configuration file for '${toolName}' at '${path}' because it already exists.\n` +
              'This is to prevent overwriting a potentially customized file. ' +
              'If you want to regenerate it with Angular recommended defaults, please delete the existing file and re-run the command.\n' +
              'You can review the latest recommendations at https://angular.dev/ai/develop-with-ai.',
          );

          return noop();
        }

        return mergeWith(
          apply(url('./files'), [
            applyTemplates({
              ...strings,
              rulesName,
              frontmatter,
            }),
            move(directory),
          ]),
        );
      });

    return chain(rules);
  };
}
