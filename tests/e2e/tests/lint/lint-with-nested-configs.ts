import { createDir, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default function () {
  // TODO(architect): Figure out how this test should look like post devkit/build-angular.
  return;

  const fileName = 'projects/test-project/src/app/foo/foo.ts';
  const nestedConfigContent = `
  {
    "rules": {
      "quotemark": [
        true,
        "double",
        "avoid-escape"
      ]
    }
  }`;

  return Promise.resolve()
    .then(() => createDir('projects/test-project/src/app/foo'))
    .then(() => writeFile(fileName, 'const foo = \'\';\n'))
    .then(() => writeFile('projects/test-project/src/app/foo/tslint.json', nestedConfigContent))
    .then(() => expectToFail(() => ng('lint', 'app')));
}
