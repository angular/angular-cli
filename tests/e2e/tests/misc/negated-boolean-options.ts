import { copyAssets } from '../../utils/assets';
import { execAndWaitForOutputToMatch } from '../../utils/process';

export default async function () {
  await copyAssets('schematic-boolean-option-negated', 'schematic-boolean-option-negated');

  await execAndWaitForOutputToMatch(
    'ng',
    ['generate', './schematic-boolean-option-negated:test', '--no-watch'],
    /noWatch: true/,
  );

  await execAndWaitForOutputToMatch(
    'ng',
    ['generate', './schematic-boolean-option-negated:test', '--watch'],
    /noWatch: false/,
  );
}
