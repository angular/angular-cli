import {oneLine, stripIndent} from 'common-tags';

const SilentError = require('silent-error');

const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;
const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];

function getRegExpFailPosition(str: string): number | null {
  const parts = str.split('-');
  const matched: string[] = [];

  parts.forEach(part => {
    if (part.match(projectNameRegexp)) {
      matched.push(part);
    }
  });

  const compare = matched.join('-');
  return (str !== compare) ? compare.length : null;
}

export function validateProjectName(projectName: string) {
  const errorIndex = getRegExpFailPosition(projectName);
  if (errorIndex !== null) {
    const firstMessage = oneLine`
      Project name "${projectName}" is not valid. New project names must
      start with a letter, and must contain only alphanumeric characters or dashes.
      When adding a dash the segment after the dash must also start with a letter.
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
