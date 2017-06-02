import { createDir, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';
import { getGlobalVariable } from '../../utils/env';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  const fileName = 'src/app/foo/foo.ts';
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
    .then(() => createDir('src/app/foo'))
    .then(() => writeFile(fileName, 'const foo = \'\';\n'))
    .then(() => writeFile('src/app/foo/tslint.json', nestedConfigContent))
    .then(() => expectToFail(() => ng('lint')));
}
