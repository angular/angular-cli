import { silentNg } from '../../utils/process';

export default async function () {
  // Named Development build
  await silentNg('build', 'test-project', '--configuration=development');
  await silentNg('build', '--configuration=development', 'test-project', '--no-progress');
  await silentNg('build', '--configuration=development', '--no-progress', 'test-project');
}
