import { getGlobalVariable } from '../utils/env';
import { npm } from '../utils/process';

export default function() {
  const argv = getGlobalVariable('argv');
  if (argv.nobuild) {
    return;
  }

  return npm('run', 'build', '--', '--local');
}
