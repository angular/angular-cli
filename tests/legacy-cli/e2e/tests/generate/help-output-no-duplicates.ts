import { ng } from '../../utils/process';

export default async function () {
  // Verify that there are no duplicate options
  const { stdout } = await ng('generate', 'component', '--help');
  const firstIndex = stdout.indexOf('--prefix');

  if (firstIndex < 0) {
    console.log(stdout);
    throw new Error('--prefix was not part of the help output.');
  }

  if (firstIndex !== stdout.lastIndexOf('--prefix')) {
    console.log(stdout);
    throw new Error('--prefix first and last index were different. Possible duplicate output!');
  }
}
