/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import type { ArgumentsCamelCase, Argv } from 'yargs';
import { CommandModule, CommandModuleError, Options, OtherOptions } from './command-module';
import { CommandContext } from './definitions';

class UnsupportedPassthroughCommand extends CommandModule {
  override readonly command = 'test-cmd';
  override readonly describe = 'Test command';
  override readonly shouldReportAnalytics = false;
  receivedOptions: (Options<{}> & OtherOptions) | undefined;

  override builder(argv: Argv): Argv {
    return argv;
  }

  override run(options: Options<{}> & OtherOptions): number {
    this.receivedOptions = options;

    return 0;
  }
}

class SupportedPassthroughCommand extends CommandModule {
  override readonly command = 'pass-cmd';
  override readonly describe = 'Command supporting passthrough';
  override readonly shouldReportAnalytics = false;
  protected override readonly acceptsPassthroughArgs = true;
  receivedOptions: (Options<{}> & OtherOptions) | undefined;
  receivedPassthroughArgs: readonly string[] | undefined;

  override builder(argv: Argv): Argv {
    return argv;
  }

  override run(options: Options<{}> & OtherOptions): number {
    this.receivedOptions = options;
    this.receivedPassthroughArgs = this.passthroughArgs;

    return 0;
  }
}

function createCommandContext(): CommandContext {
  return {
    currentDirectory: '/workspace',
    root: '/workspace',
    logger: new logging.NullLogger(),
    args: {
      positional: [],
      options: {
        help: false,
        jsonHelp: false,
        getYargsCompletions: false,
      },
    },
  } as unknown as CommandContext;
}

describe('CommandModule passthrough arguments', () => {
  it('rejects arguments after "--" when command does not support passthrough', async () => {
    const command = new UnsupportedPassthroughCommand(createCommandContext());
    const args = {
      _: ['test-cmd'],
      $0: 'ng',
      '--': ['--update'],
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await expectAsync(command.handler(args)).toBeRejectedWithError(
      CommandModuleError,
      'Arguments following "--" are not supported by the "test-cmd" command.',
    );
    expect(command.receivedOptions).toBeUndefined();
  });

  it('allows empty "--" array on commands that do not support passthrough', async () => {
    const command = new UnsupportedPassthroughCommand(createCommandContext());
    const args = {
      _: ['test-cmd'],
      $0: 'ng',
      '--': [],
      watch: false,
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await command.handler(args);

    expect(command.receivedOptions).toEqual({ watch: false });
    expect('--' in (command.receivedOptions ?? {})).toBeFalse();
  });

  it('forwards "--" arguments via passthroughArgs and omits "--" from options when supported', async () => {
    const command = new SupportedPassthroughCommand(createCommandContext());
    const args = {
      _: ['pass-cmd'],
      $0: 'ng',
      '--': ['--update', '--reporter=verbose'],
      watch: false,
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await command.handler(args);

    expect(command.receivedPassthroughArgs).toEqual(['--update', '--reporter=verbose']);
    expect(command.receivedOptions).toEqual({ watch: false });
    expect('--' in (command.receivedOptions ?? {})).toBeFalse();
  });
});
