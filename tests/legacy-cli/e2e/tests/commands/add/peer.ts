import { assetDir } from '../../../utils/assets';
import { ng } from '../../../utils/process';

const warning = 'Adding the package may not succeed.';

export default async function () {
  const { stderr: bad } = await ng('add', assetDir('add-collection-peer-bad'));
  if (!bad.includes(warning)) {
    throw new Error('peer warning not shown on bad package');
  }

  const { stderr: base  } = await ng('add', assetDir('add-collection'));
  if (base.includes(warning)) {
    throw new Error('peer warning shown on base package');
  }

  const { stderr: good  } = await ng('add', assetDir('add-collection-peer-good'));
  if (good.includes(warning)) {
    throw new Error('peer warning shown on good package');
  }
}
