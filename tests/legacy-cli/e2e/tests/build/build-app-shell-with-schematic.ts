import { getGlobalVariable } from '../../utils/env';
import { appendToFile, expectFileToMatch, replaceInFile } from '../../utils/fs';
import { ng, silentNpm } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';


export default async function () {
  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');
  await ng('generate', 'appShell', '--client-project', 'test-project');
  await updateJsonFile('package.json', packageJson => {
    const dependencies = packageJson['dependencies'];
    dependencies['@angular/platform-server'] = getGlobalVariable('argv')['ng-snapshots']
      ? 'github:angular/platform-server-builds'
      : readNgVersion();
  });

  if (argv['ve']) {
    await replaceInFile('src/main.server.ts', /renderModule/g, 'renderModuleFactory');
  }

  await silentNpm('install');
  await ng('run', 'test-project:app-shell');
  await expectFileToMatch('dist/test-project/index.html', /app-shell works!/);
}
