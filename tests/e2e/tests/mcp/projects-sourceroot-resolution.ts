import { exec, ProcessOutput, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import assert from 'node:assert/strict';

const MCP_INSPECTOR_PACKAGE_NAME = '@modelcontextprotocol/inspector-cli';
const MCP_INSPECTOR_PACKAGE_VERSION = '0.16.2';
const MCP_INSPECTOR_COMMAND_NAME = 'mcp-inspector-cli';

async function runInspector(...args: string[]): Promise<ProcessOutput> {
  return exec(MCP_INSPECTOR_COMMAND_NAME, '--cli', 'npx', '--no', '@angular/cli', 'mcp', ...args);
}

export default async function () {
  await silentNpm(
    'install',
    '--ignore-scripts',
    '-g',
    `${MCP_INSPECTOR_PACKAGE_NAME}@${MCP_INSPECTOR_PACKAGE_VERSION}`,
  );

  try {
    // 1. Add a sample project with a non-root path to angular.json
    await updateJsonFile('angular.json', (workspaceJson) => {
      workspaceJson.projects ??= {};
      workspaceJson.projects['sample-lib'] = {
        root: 'projects/sample-lib',
        sourceRoot: 'projects/sample-lib/src',
        projectType: 'library',
      };
    });

    // 2. Call list_projects
    const { stdout } = await runInspector('--method', 'tools/call', '--tool-name', 'list_projects');

    // 3. Verify output
    assert.match(stdout, /"name": "sample-lib"/);
    // Assert that sourceRoot is NOT duplicated
    assert.match(stdout, /"sourceRoot": "projects\/sample-lib\/src"/);
    assert.doesNotMatch(stdout, /"sourceRoot": "projects\/sample-lib\/projects\/sample-lib\/src"/);
  } finally {
    // 4. Cleanup angular.json
    await updateJsonFile('angular.json', (workspaceJson) => {
      delete workspaceJson.projects['sample-lib'];
    });
    await silentNpm('uninstall', '-g', MCP_INSPECTOR_PACKAGE_NAME);
  }
}
