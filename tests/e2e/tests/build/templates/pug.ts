import {
  writeMultipleFiles,
  expectFileToMatch,
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/foo.pug': stripIndents`
      h1 foo
    `})
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/foo.html', // .pug?
      /<h1>foo<\/h1>/))
}
