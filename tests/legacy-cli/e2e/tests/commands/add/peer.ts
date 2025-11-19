import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { cp } from 'node:fs/promises';
import { assetDir } from '../../../utils/assets';
import { ng } from '../../../utils/process';

export default async function (): Promise<void> {
  const warning = /Adding the package may not succeed/;

  const stdout1 = await runNgAdd('add-collection-peer-bad');
  assert.match(
    stdout1,
    warning,
    `Peer warning should be shown for add-collection-peer-bad but was not.`,
  );

  const stdout2 = await runNgAdd('add-collection-dir');
  assert.doesNotMatch(
    stdout2,
    warning,
    `Peer warning should NOT be shown for add-collection-dir but was.`,
  );

  const stdout3 = await runNgAdd('add-collection-peer-good');
  assert.doesNotMatch(
    stdout3,
    warning,
    `Peer warning should NOT be shown for add-collection-peer-good but was.`,
  );
}

async function runNgAdd(collectionName: string): Promise<string> {
  const collectionPath = resolve(collectionName);

  // Copy locally as bun doesn't install the dependency correctly if it has symlinks.
  await cp(assetDir(collectionName), collectionPath, {
    recursive: true,
    dereference: true,
  });

  const { stdout } = await ng('add', collectionPath, '--skip-confirmation');

  return stdout;
}
