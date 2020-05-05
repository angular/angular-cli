import { ng } from '../../utils/process';
import { createProject } from '../../utils/project';

export default async function() {
  await createProject('strict-test-project', '--strict');
  await ng('e2e', '--prod');
}
