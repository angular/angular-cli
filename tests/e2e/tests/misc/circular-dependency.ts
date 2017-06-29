import { prependToFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  await prependToFile('src/app/app.component.ts',
    `import { AppModule } from './app.module'; console.log(AppModule);`);
  let output = await ng('build', '--show-circular-dependencies');
  if (!output.stdout.match(/WARNING in Circular dependency detected/)) {
    throw new Error('Expected to have circular dependency warning in output.');
  }

  await ng('set', 'apps.0.showCircularDependencies=false');
  output = await ng('build');
  if (output.stdout.match(/WARNING in Circular dependency detected/)) {
    throw new Error('Expected to not have circular dependency warning in output.');
  }
}
