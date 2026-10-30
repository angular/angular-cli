/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { parseInitialCommandArguments } from './command-runner';

describe('parseInitialCommandArguments', () => {
  it('should not treat a schematic argument named help as the help flag', () => {
    const { help, positional } = parseInitialCommandArguments(['generate', 'm', 'help']);

    expect(help).toBeFalse();
    expect(positional).toEqual(['generate', 'm', 'help']);
  });

  it('should treat --help as the help flag', () => {
    const { help, positional } = parseInitialCommandArguments(['generate', 'm', '--help']);

    expect(help).toBeTrue();
    expect(positional).toEqual(['generate', 'm']);
  });

  it('should treat -h as the help flag', () => {
    const { help } = parseInitialCommandArguments(['generate', '-h']);

    expect(help).toBeTrue();
  });

  it('should treat --json-help as the help flag', () => {
    const { help, jsonHelp } = parseInitialCommandArguments(['generate', '--json-help']);

    expect(jsonHelp).toBeTrue();
    expect(help).toBeTrue();
  });
});
