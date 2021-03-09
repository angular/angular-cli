import { expectFileToExist, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function() {
  try {
    process.env['NG_BUILD_PROFILING'] = '1';
    await ng('build', '--configuration=development');
    await expectFileToExist('chrome-profiler-events.json');
    await expectFileToExist('speed-measure-plugin.json');
    await expectFileToMatch('speed-measure-plugin.json', 'plugins');
  } finally {
    process.env['NG_BUILD_PROFILING'] = undefined;
  }
}
