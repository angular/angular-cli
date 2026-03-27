import assert from 'node:assert/strict';
import { exec, ProcessOutput, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

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
    // 1. Add a project with malformed attributes to angular.json
    await updateJsonFile('angular.json', (workspaceJson) => {
      workspaceJson.projects ??= {};
      workspaceJson.projects['invalid-lib'] = {
        root: 'projects/invalid-lib',
        sourceRoot: 'projects/invalid-lib/src',
        prefix: 12345 as any, // Invalid!
      };
    });

    // 2. Call list_projects
    const { stdout } = await runInspector('--method', 'tools/call', '--tool-name', 'list_projects');

    // 3. Verify that the warning section exists and lists the fallbacks
    assert.match(stdout, /Warning: The following \d+ project validation issue\(s\) were found/);
    assert.match(stdout, /Invalid `prefix`/);
  } finally {
    // 4. Cleanup angular.json
    await updateJsonFile('angular.json', (workspaceJson) => {
      delete workspaceJson.projects['invalid-lib'];
    });
    await silentNpm('uninstall', '-g', MCP_INSPECTOR_PACKAGE_NAME);
  }
}
