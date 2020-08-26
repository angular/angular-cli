import { join } from 'path';
import { ng } from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';

export default function () {
  const root = process.cwd();
  const modulePath = join(root, 'src', 'app', 'app.module.ts');
  const subModulePath = join('src', 'app', 'sub', 'sub.module.ts');
  const deepSubModulePath = join('src', 'app', 'sub', 'deep', 'deep.module.ts');

  return Promise.resolve()
    .then(() => ng('generate', 'module', 'sub'))
    .then(() => ng('generate', 'module', 'sub/deep'))

    .then(() => ng('generate', 'module', 'test1', '--module', 'app.module.ts'))
    .then(() => expectFileToMatch(modulePath,
      /import { Test1Module } from '.\/test1\/test1.module'/))
    .then(() => expectFileToMatch(modulePath, /imports: \[(.|\s)*Test1Module(.|\s)*\]/m))

    .then(() => ng('generate', 'module', 'test2', '--module', 'app.module'))
    .then(() => expectFileToMatch(modulePath,
      /import { Test2Module } from '.\/test2\/test2.module'/))
    .then(() => expectFileToMatch(modulePath, /imports: \[(.|\s)*Test2Module(.|\s)*\]/m))

    .then(() => ng('generate', 'module', 'test3', '--module', 'app'))
    .then(() => expectFileToMatch(modulePath,
      /import { Test3Module } from '.\/test3\/test3.module'/))
    .then(() => expectFileToMatch(modulePath, /imports: \[(.|\s)*Test3Module(.|\s)*\]/m))

    .then(() => ng('generate', 'module', 'test4', '--routing', '--module', 'app'))
    .then(() => expectFileToMatch(modulePath, /imports: \[(.|\s)*Test4Module(.|\s)*\]/m))
    .then(() => expectFileToMatch(join('src', 'app', 'test4', 'test4.module.ts'),
      /import { Test4RoutingModule } from '.\/test4-routing.module'/))
    .then(() => expectFileToMatch(join('src', 'app', 'test4', 'test4.module.ts'),
      /imports: \[(.|\s)*Test4RoutingModule(.|\s)*\]/m))

    .then(() => ng('generate', 'module', 'test5', '--module', 'sub'))
    .then(() => expectFileToMatch(subModulePath,
      /import { Test5Module } from '..\/test5\/test5.module'/))
    .then(() => expectFileToMatch(subModulePath, /imports: \[(.|\s)*Test5Module(.|\s)*\]/m))

    .then(() => ng('generate', 'module', 'test6', '--module', join('sub', 'deep'))
    .then(() => expectFileToMatch(deepSubModulePath,
      /import { Test6Module } from '..\/..\/test6\/test6.module'/))
    .then(() => expectFileToMatch(deepSubModulePath, /imports: \[(.|\s)*Test6Module(.|\s)*\]/m)));

    // E2E_DISABLE: temporarily disable pending investigation
    // .then(() => process.chdir(join(root, 'src', 'app')))
    // .then(() => ng('generate', 'module', 'test7', '--module', 'app.module.ts'))
    // .then(() => process.chdir('..'))
    // .then(() => expectFileToMatch(modulePath,
    //   /import { Test7Module } from '.\/test7\/test7.module'/))
    // .then(() => expectFileToMatch(modulePath, /imports: \[(.|\s)*Test7Module(.|\s)*\]/m));
}
