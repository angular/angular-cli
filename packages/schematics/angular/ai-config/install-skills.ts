/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Rule } from '@angular-devkit/schematics';
import { RunSchematicTask } from '@angular-devkit/schematics/tasks';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { latestVersions } from '../utility/latest-versions';
import { Tool } from './schema';

type SkillsTool = Exclude<Tool, Tool.None>;

interface AngularSkillsInstallOptions {
  tools: readonly string[];
  workingDirectory?: string;
}

const SKILLS_AGENT: { [key in SkillsTool]: string } = {
  ['claude-code']: 'claude-code',
  cursor: 'cursor',
  ['gemini-cli']: 'gemini-cli',
  ['open-ai-codex']: 'codex',
  vscode: 'github-copilot',
};

const ANGULAR_SKILLS_REPOSITORY = 'https://github.com/angular/skills';

export function getAngularSkillsRepository(angularVersion = latestVersions.Angular): string {
  const version = angularVersion.match(/(\d+)\.(\d+)/);
  if (!version) {
    throw new Error(`Unable to determine the Angular release line from '${angularVersion}'.`);
  }

  return `${ANGULAR_SKILLS_REPOSITORY}/tree/${version[1]}.${version[2]}.x`;
}

export function getAngularSkillsInstallArguments(
  tools: readonly string[],
  angularVersion = latestVersions.Angular,
): string[] {
  const agents = tools.flatMap((tool) => {
    const agent = SKILLS_AGENT[tool as SkillsTool];
    if (!agent) {
      throw new Error(`Unsupported AI tool '${tool}' for Angular Agent Skills.`);
    }

    return ['--agent', agent];
  });

  return [
    '--yes',
    'skills',
    'add',
    getAngularSkillsRepository(angularVersion),
    '--skill',
    'angular-developer',
    '--skill',
    'angular-new-app',
    ...agents,
    '--copy',
    '--yes',
  ];
}

export function createAngularSkillsTask(
  tools: readonly string[],
  workingDirectory?: string,
): RunSchematicTask<AngularSkillsInstallOptions> {
  return new RunSchematicTask(
    'ai-config-install-skills',
    workingDirectory === undefined ? { tools } : { tools, workingDirectory },
  );
}

export default function (options: AngularSkillsInstallOptions): Rule {
  return (_tree, context) => {
    const args = getAngularSkillsInstallArguments(options.tools);

    try {
      execFileSync('npx', args, {
        cwd: resolve(options.workingDirectory ?? '.'),
        env: { ...process.env, DISABLE_TELEMETRY: '1' },
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
    } catch {
      context.logger.warn(
        'Angular Agent Skills could not be installed.\n' +
          `When you are online, install them manually with:\n  npx ${args.join(' ')}`,
      );
    }
  };
}
