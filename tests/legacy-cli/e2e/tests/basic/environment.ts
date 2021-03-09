import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';


export default async function () {
  // Try a prod build.
  await updateJsonFile('angular.json', configJson => {
    const appArchitect = configJson.projects['test-project'].architect;
    appArchitect.build.configurations['prod-env'] = {
      ...appArchitect.build.configurations['development'],
      fileReplacements: [
        {
          src: 'src/environments/environment.ts',
          replaceWith: 'src/environments/environment.prod.ts',
        },
      ],
    };
  });

  await ng('build', '--configuration=prod-env');
  await expectFileToMatch('dist/test-project/main.js', /production:\s*true/);
}
