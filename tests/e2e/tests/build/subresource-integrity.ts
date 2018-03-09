import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

const integrityRe = /integrity="\w+-[A-Za-z0-9\/\+=]+"/;

export default async function() {
  // WEBPACK4_DISABLED - disabled pending a webpack 4 version
  return;

  return ng('build')
    .then(() => expectToFail(() =>
      expectFileToMatch('dist/index.html', integrityRe)))
    .then(() => ng('build', '--sri'))
    .then(() => expectFileToMatch('dist/index.html', integrityRe));
}
