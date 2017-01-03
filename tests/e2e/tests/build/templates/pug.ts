import {
  writeMultipleFiles,
  deleteFile,
  expectFileToMatch,
  replaceInFile
} from '../../../utils/fs';
import { ng } from '../../../utils/process';
import { stripIndents } from 'common-tags';

export default function () {
  return writeMultipleFiles({
    'src/app/app.component.pug': stripIndents`
      h1 foo
    `})
    .then(() => deleteFile('src/app/app.component.html'))
    .then(() => replaceInFile('src/app/app.component.ts',
      './app.component.html', './app.component.pug'))
    .then(() => ng('build'))
    .then(() => expectFileToMatch('dist/app/app.component.pug', // .html?
      /<h1>foo<\/h1>/))
}
