import { assetDir } from '../../../utils/assets';
import { ng } from '../../../utils/process';

const warning = 'Adding the package may not succeed.';

export default async function () {
  const { stdout: bad } = await ng(
    'add',
    assetDir('add-collection-peer-bad'),
    '--skip-confirmation',
  );
  if (!bad.includes(warning)) {
    throw new Error('peer warning not shown on bad package');
  }

  const { stdout: base } = await ng('add', assetDir('add-collection'), '--skip-confirmation');
  if (base.includes(warning)) {
    throw new Error('peer warning shown on base package');
  }

  const { stdout: good } = await ng(
    'add',
    assetDir('add-collection-peer-good'),
    '--skip-confirmation',
  );
  if (good.includes(warning)) {
    throw new Error('peer warning shown on good package');
  }
}
