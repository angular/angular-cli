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
  const [nodeMajor, nodeMinor] = process.versions.node.split('.', 2).map(Number);
  if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 16)) {
    console.log('Test bypassed: find_examples tool requires Node.js 22.16 or higher.');

    return;
  }

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
    'find_examples',
    '--tool-arg',
    'query=if',
  );

  assert.match(stdoutInsideWorkspace, /Using the @if Built-in Control Flow Block/);
}
