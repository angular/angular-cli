import {
  writeMultipleFiles,
  expectFileToMatch,
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/app/app.component.html': stripIndents`
      <h1>foo</h1>
    `})
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/app/app.component.html',
      /<h1>foo<\/h1>/))
}
