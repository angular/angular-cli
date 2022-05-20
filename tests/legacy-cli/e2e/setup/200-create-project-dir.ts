import { mkdir } from 'fs/promises';
import { join } from 'path';
import { getGlobalVariable, setGlobalVariable } from '../utils/env';

/**
 * Create a parent directory for test projects to be created within.
 * Change the cwd() to that directory in preparation for launching the cli.
 */
export default async function () {
  const tempRoot: string = getGlobalVariable('tmp-root');
  const projectsRoot = join(tempRoot, 'e2e-test');

  setGlobalVariable('projects-root', projectsRoot);

  await mkdir(projectsRoot);

  console.log(`  Using "${projectsRoot}" as temporary directory for a new project.`);
  process.chdir(projectsRoot);
}
