import { expectFileToMatch, replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';


export default async function() {
  await replaceInFile('angular.json', '"architect":', '"targets":');

  await ng('build');

  await expectFileToMatch('angular.json', '"architect":');
  await expectToFail(() => expectFileToMatch('angular.json', '"targets":'));
}
