import { ng } from '../../utils/process';
import { updateTsConfig } from '../../utils/project';

export default async function () {
  // Update project to disable experimental decorators
  await updateTsConfig((json) => {
    json['compilerOptions']['experimentalDecorators'] = false;
  });

  // Default production build
  await ng('build');

  // Production build with JIT
  await ng('build', '--no-aot', '--no-build-optimizer');

  // Default development build
  await ng('build', '--configuration=development');

  // Development build with JIT
  await ng('build', '--configuration=development', '--no-aot');

  // Unit tests (JIT only)
  await ng('test', '--no-watch');

  // E2E tests to ensure application functions in a browser
  await ng('e2e');
}
