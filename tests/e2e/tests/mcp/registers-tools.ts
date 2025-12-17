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

  // Ensure 'list_projects' is registered when inside an Angular workspace
  try {
    const { stdout: stdoutInsideWorkspace } = await runInspector('--method', 'tools/list');

    assert.match(stdoutInsideWorkspace, /"list_projects"/);
    assert.match(stdoutInsideWorkspace, /"get_best_practices"/);
    assert.match(stdoutInsideWorkspace, /"search_documentation"/);

    chdir('..');

    const { stdout: stdoutOutsideWorkspace } = await runInspector('--method', 'tools/list');

    assert.match(stdoutOutsideWorkspace, /"list_projects"/);
    assert.match(stdoutOutsideWorkspace, /"get_best_practices"/);
    assert.match(stdoutInsideWorkspace, /"search_documentation"/);
  } finally {
    await silentNpm('uninstall', '-g', MCP_INSPECTOR_PACKAGE_NAME);
  }
}
