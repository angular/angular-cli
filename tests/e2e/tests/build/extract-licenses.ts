import {join} from 'path';
import {expectFileToExist} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';
import {ng} from '../../utils/process';

export default function() {
  return ng('build', '--prod', '--extract-licenses=false')
    .then(() => expectFileToExist(join(process.cwd(), 'dist')))
    .then(() => expectToFail(() => expectFileToExist('dist/3rdpartylicenses.txt')));
}
