import { chdir } from 'node:process';
import { exec, ProcessOutput, silentNpm } from '../../utils/process';
import assert from 'node:assert/strict';

const MCP_INSPECTOR_PACKAGE_NAME = '@modelcontextprotocol/inspector-cli';
const MCP_INSPECTOR_PACKAGE_VERSION = '0.16.2';
const MCP_INSPECTOR_COMMAND_NAME = 'mcp-inspector-cli';

async function runInspector(...args: string[]): Promise<ProcessOutput> {
  const result = await exec(
    MCP_INSPECTOR_COMMAND_NAME,
    '--cli',
    'npx',
    '--no',
    '@angular/cli',
    'mcp',
    ...args,
  );

  return result;
}

export default async function () {
  await silentNpm(
    'install',
    '--ignore-scripts',
    '-g',
    `${MCP_INSPECTOR_PACKAGE_NAME}@${MCP_INSPECTOR_PACKAGE_VERSION}`,
  );

  // Ensure `get_best_practices` returns the markdown content
  const { stdout: stdoutInsideWorkspace } = await runInspector(
    '--method',
    'tools/call',
    '--tool-name',
    'ai_tutor',
  );

  assert.match(stdoutInsideWorkspace, /# `airules.md` - Modern Angular Tutor 🧑‍🏫/);
}
