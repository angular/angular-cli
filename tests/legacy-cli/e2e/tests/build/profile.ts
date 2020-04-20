import { expectFileToExist, expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function() {
  try {
    process.env['NG_BUILD_PROFILING'] = '1';
    await ng('build');
    await expectFileToExist('chrome-profiler-events-es2015.json');
    await expectFileToExist('speed-measure-plugin-es2015.json');
    await expectFileToMatch('speed-measure-plugin-es2015.json', 'plugins');
  } finally {
    process.env['NG_BUILD_PROFILING'] = undefined;
  }
}
