import { execAndWaitForOutputToMatch } from '../../utils/process';

export default async function () {
  const currentDirectory = process.cwd();

  try {
    process.chdir('..');

    // The below is a way to validate that the `--collection` option is being considered.
    await execAndWaitForOutputToMatch(
      'ng',
      ['new', '--collection', 'invalid-schematic'],
      /Collection "invalid-schematic" cannot be resolved/,
    );
  } finally {
    // Change directory back
    process.chdir(currentDirectory);
  }
}
