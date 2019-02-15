import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
} from '../../utils/process';
import { writeFile, prependToFile } from '../../utils/fs';
import {getGlobalVariable} from '../../utils/env';


const successRe = /: Compiled successfully/;

export default async function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  if (process.platform.startsWith('win')) {
    return;
  }

  await writeFile('src/app/type.ts', `export type MyType = number;`);
  await prependToFile('src/app/app.component.ts', 'import { MyType } from "./type";\n');

  try {
    await execAndWaitForOutputToMatch('ng', ['serve'], successRe);

    await Promise.all([
      waitForAnyProcessOutputToMatch(successRe, 20000),
      writeFile('src/app/type.ts', `export type MyType = string;`),
    ]);
  } finally {
    killAllProcesses();
  }
}
