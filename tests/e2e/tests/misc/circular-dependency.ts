import { prependToFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  await prependToFile('projects/test-project/src/app/app.component.ts',
    `import { AppModule } from './app.module'; console.log(AppModule);`);
  let output = await ng('build', '--show-circular-dependencies');
  if (!output.stdout.match(/WARNING in Circular dependency detected/)) {
    throw new Error('Expected to have circular dependency warning in output.');
  }
}
