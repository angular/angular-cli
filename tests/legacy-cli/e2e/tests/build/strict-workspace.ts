import {ng} from '../../utils/process';
import { createProject } from '../../utils/project';

export default async function() {
  await createProject('strict-workspace-test-project', '--strict');
  await ng('build');
}
