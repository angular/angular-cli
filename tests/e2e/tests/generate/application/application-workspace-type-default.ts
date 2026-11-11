import { expectFileNotToExist, expectFileToMatch } from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { updateJsonFile } from '../../../utils/project';

export default async function () {
  await updateJsonFile('angular.json', (config) => {
    config.schematics = {
      '@schematics/angular:component': { type: 'component' },
    };
  });

  for (const style of ['2025', '2016']) {
    const project = `app-${style}`;
    const appPath = `projects/${project}/src/app`;
    const componentName = style === '2016' ? 'app.component' : 'app';

    await ng(
      'generate',
      'application',
      project,
      `--file-name-style-guide=${style}`,
      '--style=css',
      '--ssr=false',
      '--skip-install',
    );
    await ng('build', project, '--configuration=development');
    await expectFileToMatch(`${appPath}/${componentName}.ts`, `styleUrl: './${componentName}.css'`);
    await expectFileNotToExist(`${appPath}/${style === '2016' ? 'app' : 'app.component'}.ts`);
  }

  // Ordinary component generation should still use the workspace default.
  await ng('generate', 'component', 'example', '--project=app-2025', '--skip-tests');
  await expectFileToMatch('projects/app-2025/src/app/example/example.component.ts', 'export class');
}
