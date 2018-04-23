/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tags } from '@angular-devkit/core';
import { SchematicsException } from '@angular-devkit/schematics';

export function validateName(name: string): void {
  if (name && /^\d/.test(name)) {
    throw new SchematicsException(tags.oneLine`name (${name})
        can not start with a digit.`);
  }
}

// Must start with a letter, and must contain only alphanumeric characters or dashes.
// When adding a dash the segment after the dash must also start with a letter.
export const htmlSelectorRe = /^[a-zA-Z][.0-9a-zA-Z]*(:?-[a-zA-Z][.0-9a-zA-Z]*)*$/;

export function validateHtmlSelector(selector: string): void {
  if (selector && !htmlSelectorRe.test(selector)) {
    throw new SchematicsException(tags.oneLine`Selector (${selector})
        is invalid.`);
  }
}


export function validateProjectName(projectName: string) {
  const errorIndex = getRegExpFailPosition(projectName);
  const unsupportedProjectNames = ['test', 'ember', 'ember-cli', 'vendor', 'app'];
  const packageNameRegex = /^(?:@[a-zA-Z0-9_-]+\/)?[a-zA-Z0-9_-]+$/;
  if (errorIndex !== null) {
    const firstMessage = tags.oneLine`
    Project name "${projectName}" is not valid. New project names must
    start with a letter, and must contain only alphanumeric characters or dashes.
    When adding a dash the segment after the dash must also start with a letter.
    `;
    const msg = tags.stripIndent`
    ${firstMessage}
    ${projectName}
    ${Array(errorIndex + 1).join(' ') + '^'}
    `;
    throw new SchematicsException(msg);
  } else if (unsupportedProjectNames.indexOf(projectName) !== -1) {
    throw new SchematicsException(
      `Project name ${JSON.stringify(projectName)} is not a supported name.`);
  } else if (!packageNameRegex.test(projectName)) {
    throw new SchematicsException(`Project name ${JSON.stringify(projectName)} is invalid.`);
  }
}

function getRegExpFailPosition(str: string): number | null {
  const isScope = /^@.*\/.*/.test(str);
  if (isScope) {
    // Remove starting @
    str = str.replace(/^@/, '');
    // Change / to - for validation
    str = str.replace(/\//g, '-');
  }

  const parts = str.indexOf('-') >= 0 ? str.split('-') : [str];
  const matched: string[] = [];

  const projectNameRegexp = /^[a-zA-Z][.0-9a-zA-Z]*(-[.0-9a-zA-Z]*)*$/;

  parts.forEach(part => {
    if (part.match(projectNameRegexp)) {
      matched.push(part);
    }
  });

  const compare = matched.join('-');

  return (str !== compare) ? compare.length : null;
}
