import {oneLine, stripIndent} from 'common-tags';

const SilentError = require('silent-error');

const projectNameRegexp = /^[a-zA-Z][0-9a-zA-Z]*([-. ][a-zA-Z][0-9a-zA-Z]*)*$/;
const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];

function getRegExpFailPosition(str: string): number {
  if (projectNameRegexp.test(str)) { return -1; }

  const parts = str.split('-');
  const matched: string[] = [];

  parts.forEach(part => {
    if (projectNameRegexp.test(part)) {
      matched.push(part);
    }
  });

  const compare = matched.join('-');
  return (str !== compare) ? compare.length : -1;
}

export function validateProjectName(projectName: string) {
  const errorIndex = getRegExpFailPosition(projectName);
  if (errorIndex !== -1) {
    const firstMessage = oneLine`
      Project name "${projectName}" is not valid. New project names must
      start with a letter, and must contain only alphanumeric characters, spaces, dots or dashes.
      New project name must end with alphanumeric characters.
      When adding a dash, space or dot the segment after the it must also start with a letter.
    `;
    const msg = stripIndent`
      ${firstMessage}
      ${projectName}
      ${Array(errorIndex + 1).join(' ') + '^'}
    `;
    throw new SilentError(msg);
  } else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
    throw new SilentError(`Project name "${projectName}" is not a supported name.`);
  }

}
