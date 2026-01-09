import { installPackage } from './packages';
import { updateJsonFile } from './project';

/** Updates the `test` builder in the current workspace to use Vitest. */
export async function applyVitestBuilder(): Promise<void> {
  // These deps matches the deps in `@schematics/angular`
  await installPackage('vitest@^4.0.8');
  await installPackage('jsdom@^27.1.0');

  await updateJsonFile('angular.json', (json) => {
    const projects = Object.values(json['projects']);
    if (projects.length !== 1) {
      throw new Error(
        `Expected exactly one project but found ${projects.length} projects named ${Object.keys(
          json['projects'],
        ).join(', ')}`,
      );
    }
    const project = projects[0]! as any;

    // Update to Vitest builder.
    const test = project['architect']['test'];
    test['builder'] = '@angular/build:unit-test';
    test['options'] = {};
  });

  await updateJsonFile('tsconfig.spec.json', (tsconfig) => {
    tsconfig['compilerOptions']['types'] = ['vitest/globals'];
  });
}
