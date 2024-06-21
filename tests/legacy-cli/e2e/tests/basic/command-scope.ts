import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { silentNg } from '../../utils/process';

export default async function () {
  // Run inside workspace
  await silentNg('generate', 'component', 'foo', '--dry-run');

  // The version command can be run in and outside of a workspace.
  await silentNg('version');

  assert.rejects(
    silentNg('new', 'proj-name', '--dry-run'),
    /This command is not available when running the Angular CLI inside a workspace\./,
  );

  // Change CWD to run outside a workspace.
  process.chdir(homedir());

  // ng generate can only be ran inside.
  assert.rejects(
    silentNg('generate', 'component', 'foo', '--dry-run'),
    /This command is not available when running the Angular CLI outside a workspace\./,
  );

  // ng new can only be ran outside of a workspace
  await silentNg('new', 'proj-name', '--dry-run');

  // The version command can be run in and outside of a workspace.
  await silentNg('version');
}
