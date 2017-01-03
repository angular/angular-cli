import {
  writeMultipleFiles,
  expectFileToMatch,
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/foo.html': stripIndents`
      <h1>foo</h1>
    `})
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/foo.html',
      /<h1>foo<\/h1>/))
}
