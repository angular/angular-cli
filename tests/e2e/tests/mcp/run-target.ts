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

  try {
    // 1. Ensure `run_target` is NOT registered by default (stable-only tools registered)
    const { stdout: stdoutDefault } = await runInspector('--method', 'tools/list');
    assert.doesNotMatch(stdoutDefault, /"run_target"/);

    // 2. Ensure `run_target` is registered when explicitly enabled via experimental-tool flag
    const { stdout: stdoutEnabled } = await runInspector(
      '-E',
      'run_target',
      '--method',
      'tools/list',
    );
    assert.match(stdoutEnabled, /"run_target"/);

    // 3. Call run_target with build target
    const { stdout: stdoutCall } = await runInspector(
      '-E',
      'run_target',
      '--method',
      'tools/call',
      '--tool-name',
      'run_target',
      '--tool-arg',
      'target=build',
    );
    assert.match(stdoutCall, /"status":\s*"success"/);
  } finally {
    // 4. Clean up global installation
    await silentNpm('uninstall', '-g', MCP_INSPECTOR_PACKAGE_NAME);
  }
}
