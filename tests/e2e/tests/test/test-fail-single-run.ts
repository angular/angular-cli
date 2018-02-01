import { ng } from '../../utils/process';
import { writeFile } from '../../utils/fs';
import { expectToFail } from '../../utils/utils';


export default function () {
  // Fails on single run with broken compilation.
  return writeFile('src/app.component.spec.ts', '<p> definitely not typescript </p>')
    .then(() => expectToFail(() => ng('test', '--single-run')));
}
