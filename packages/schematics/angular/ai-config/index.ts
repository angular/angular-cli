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

type ToolWithoutNone = Exclude<Tool, Tool.None>;

const AI_TOOLS: { [key in ToolWithoutNone]: ContextFileInfo } = {
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
  if (!tool || tool.includes(Tool.None)) {
    return noop();
  }

  const files: ContextFileInfo[] = (tool as ToolWithoutNone[]).map(
    (selectedTool) => AI_TOOLS[selectedTool],
  );

  const rules = files.map(({ rulesName, directory, frontmatter }) =>
    mergeWith(
      apply(url('./files'), [
        applyTemplates({
          ...strings,
          rulesName,
          frontmatter,
        }),
        move(directory),
      ]),
    ),
  );

  return chain(rules);
}
