import assert from 'node:assert/strict';
import { assetDir } from '../../../utils/assets';
import { ng } from '../../../utils/process';

const warning = 'Adding the package may not succeed.';

export default async function () {
  const { stdout: bad } = await ng(
    'add',
    assetDir('add-collection-peer-bad'),
    '--skip-confirmation',
  );
  assert.match(bad, new RegExp(warning), 'peer warning not shown on bad package');

  const { stdout: base } = await ng('add', assetDir('add-collection'), '--skip-confirmation');
  assert.doesNotMatch(base, new RegExp(warning), 'peer warning shown on base package');

  const { stdout: good } = await ng(
    'add',
    assetDir('add-collection-peer-good'),
    '--skip-confirmation',
  );
  assert.doesNotMatch(good, new RegExp(warning), 'peer warning shown on good package');
}
