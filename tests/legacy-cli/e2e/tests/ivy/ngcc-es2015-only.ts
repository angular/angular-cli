
import { ng } from '../../utils/process';
import { createProject } from '../../utils/project';

export default async function() {
  // Create a new project to avoid polluting node modules for other tests
  await createProject('ivy-project-ngcc', '--enable-ivy');

  const { stderr, stdout } = await ng('build', '--prod');

  if (stdout.includes('as esm5') || stderr.includes('as esm5')) {
    throw new Error('ngcc should not process ES5 during differential loading builds.');
  }
}
