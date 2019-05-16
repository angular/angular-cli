import {ng} from '../../utils/process';
import {deleteFile} from '../../utils/fs';
import {expectToFail} from '../../utils/utils';

export default function() {
  return deleteFile('angular.json')
    .then(() => expectToFail(() => ng('generate', 'class', 'hello')));
}
