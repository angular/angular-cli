import { ng } from '../../utils/process';
import { createProject, updateTsConfig } from '../../utils/project';


export default async function() {
  await createProject('strict-workspace-test-project', '--strict');
  await updateTsConfig(json => {
    json['compilerOptions']['skipLibCheck'] = false;
  });
  await ng('build');
}
