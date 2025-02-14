import { join } from 'node:path';
import { ng } from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';

export default async function () {
  const projectName = 'test-project-two';
  await ng('generate', 'application', projectName, '--no-standalone', '--skip-install');
  await ng('generate', 'module', 'sub', '--project', projectName);
  await ng('generate', 'module', 'sub/deep', '--project', projectName);

  const projectAppDir = `projects/${projectName}/src/app`;
  const modulePath = join(projectAppDir, 'app.module.ts');
  const subModulePath = join(projectAppDir, 'sub/sub.module.ts');
  const deepSubModulePath = join(projectAppDir, 'sub/deep/deep.module.ts');

  await ng('generate', 'module', 'test1', '--module', 'app.module.ts', '--project', projectName);
  await expectFileToMatch(modulePath, `import { Test1Module } from './test1/test1.module'`);
  await expectFileToMatch(modulePath, /imports: \[.*?Test1Module.*?\]/s);

  await ng('generate', 'module', 'test2', '--module', 'app.module', '--project', projectName);
  await expectFileToMatch(modulePath, `import { Test2Module } from './test2/test2.module'`);
  await expectFileToMatch(modulePath, /imports: \[.*?Test2Module.*?\]/s);

  await ng('generate', 'module', 'test3', '--module', 'app', '--project', projectName);
  await expectFileToMatch(modulePath, `import { Test3Module } from './test3/test3.module'`);
  await expectFileToMatch(modulePath, /imports: \[.*?Test3Module.*?\]/s);

  await ng('generate', 'module', 'test4', '--routing', '--module', 'app', '--project', projectName);
  await expectFileToMatch(modulePath, /imports: \[.*?Test4Module.*?\]/s);
  await expectFileToMatch(
    join(projectAppDir, 'test4/test4.module.ts'),
    `import { Test4RoutingModule } from './test4-routing.module'`,
  );
  await expectFileToMatch(
    join(projectAppDir, 'test4/test4.module.ts'),
    /imports: \[.*?Test4RoutingModule.*?\]/s,
  );

  await ng('generate', 'module', 'test5', '--module', 'sub', '--project', projectName);
  await expectFileToMatch(subModulePath, `import { Test5Module } from '../test5/test5.module'`);

  await expectFileToMatch(subModulePath, /imports: \[.*?Test5Module.*?\]/s);

  await ng('generate', 'module', 'test6', '--module', 'sub/deep', '--project', projectName);

  await expectFileToMatch(
    deepSubModulePath,
    `import { Test6Module } from '../../test6/test6.module'`,
  );
  await expectFileToMatch(deepSubModulePath, /imports: \[.*?Test6Module.*?\]/s);

  // E2E_DISABLE: temporarily disable pending investigation
  // await process.chdir(join(root, 'src', 'app')))
  // await ng('generate', 'module', 'test7', '--module', 'app.module.ts'))
  // await process.chdir('..'))
  // await expectFileToMatch(modulePath,
  //   /import { Test7Module } from '.\/test7\/test7.module'/))
  // await expectFileToMatch(modulePath, /imports: \[(.|\s)*Test7Module(.|\s)*\]/m));
}
