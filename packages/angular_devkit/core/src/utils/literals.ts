/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export function oneLine(strings: TemplateStringsArray, ...values: string[]) {
  const endResult = strings.map((s, i) => s + (i < values.length ? values[i] : '')).join('');

  return endResult.trim().replace(/\n\s*/gm, ' ');
}

export function indentBy(indentations: number) {
  let i = '';
  while (indentations--) {
    i += ' ';
  }

  return (strings: TemplateStringsArray, ...values: string[]) => {
    return stripIndents(strings, ...values)
      .replace(/\n/g, '\n' + i);
  };
}

export function stripIndents(strings: TemplateStringsArray, ...values: string[]) {
  const endResult = strings.map((s, i) => s + (i < values.length ? values[i] : '')).join('').trim();

  // Remove the shortest leading indentation from each line.
  const match = endResult.match(/^[ \t]*(?=\S)/gm);

  // Return early if there's nothing to strip.
  if (match === null) {
    return endResult;
  }

  const indent = Math.min(...match.map(el => el.length));
  const regexp = new RegExp('^[ \\t]{' + indent + '}', 'gm');

  return (indent > 0 ? endResult.replace(regexp, '') : endResult).replace(/[ \t]*$/, '');
}
