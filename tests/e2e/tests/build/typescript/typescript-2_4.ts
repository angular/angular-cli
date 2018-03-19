import { ng, npm } from '../../../utils/process';

export default async function () {
  // TODO(architect): this test fails with weird fsevents install errors.
  // Investigate and re-enable afterwards.
  // Might be https://github.com/npm/npm/issues/19747 or https://github.com/npm/npm/issues/11973.
  await npm('install', 'typescript@2.4');
  await ng('build');
  await ng('build', '--optimization');
  await npm('install', 'typescript@2.6');
}
