/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Target } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import type { ArgumentsCamelCase, Argv } from 'yargs';
import { ArchitectBaseCommandModule } from './architect-base-command-module';
import { CommandModuleError, Options, OtherOptions } from './command-module';
import { CommandContext } from './definitions';
import { Option } from './utilities/json-schema';

class TestArchitectCommand extends ArchitectBaseCommandModule<{}> {
  override readonly command = 'test';
  override readonly describe = 'Test architect command';
  override readonly shouldReportAnalytics = false;

  builderOptions: Option[] = [];
  builderName = '@angular/build:unit-test';
  scheduledOptions: Record<string, unknown> | undefined;

  override builder(argv: Argv): Argv {
    return argv;
  }

  override async run(options: Options<{}> & OtherOptions): Promise<number> {
    return this.runSingleTarget({ project: 'app', target: 'test' }, options);
  }

  protected override getArchitectHost() {
    return {
      getBuilderNameForTarget: async (_target: Target) => this.builderName,
    } as never;
  }

  protected override async getOptionsForBuilder(_builderConf: string): Promise<Option[]> {
    return this.builderOptions;
  }

  protected override getArchitect() {
    return {
      scheduleTarget: async (_target: Target, options: Record<string, unknown>) => {
        this.scheduledOptions = options;

        return {
          lastOutput: Promise.resolve({ success: true }),
          stop: async () => {},
        };
      },
    } as never;
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

describe('ArchitectBaseCommandModule passthrough arguments', () => {
  it('forwards arguments after "--" to the x-passthrough option', async () => {
    const command = new TestArchitectCommand(createCommandContext());
    command.builderOptions = [
      {
        name: 'runnerArgs',
        description: 'Runner args',
        type: 'array',
        passthrough: true,
      },
    ];

    const args = {
      _: ['test'],
      $0: 'ng',
      '--': ['--update', '--bail=1'],
      watch: false,
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await command.handler(args);

    expect(command.scheduledOptions).toEqual({
      watch: false,
      runnerArgs: ['--update', '--bail=1'],
    });
  });

  it('concatenates explicit option values before "--" passthrough arguments', async () => {
    const command = new TestArchitectCommand(createCommandContext());
    command.builderOptions = [
      {
        name: 'runnerArgs',
        description: 'Runner args',
        type: 'array',
        passthrough: true,
      },
    ];

    const args = {
      _: ['test'],
      $0: 'ng',
      'runner-args': ['--shard=1/2'],
      '--': ['--update'],
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await command.handler(args);

    expect(command.scheduledOptions).toEqual({
      runnerArgs: ['--shard=1/2', '--update'],
    });
  });

  it('rejects "--" arguments when the target builder has no x-passthrough option', async () => {
    const command = new TestArchitectCommand(createCommandContext());
    command.builderName = '@angular/build:application';
    command.builderOptions = [
      {
        name: 'watch',
        description: 'Watch',
        type: 'boolean',
      },
    ];

    const args = {
      _: ['build'],
      $0: 'ng',
      '--': ['--update'],
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await expectAsync(command.handler(args)).toBeRejectedWithError(
      CommandModuleError,
      "The '@angular/build:application' builder does not accept arguments after '--'.",
    );
    expect(command.scheduledOptions).toBeUndefined();
  });

  it('rejects "--" arguments when the target builder defines multiple x-passthrough options', async () => {
    const command = new TestArchitectCommand(createCommandContext());
    command.builderOptions = [
      {
        name: 'runnerArgs',
        description: 'Runner args',
        type: 'array',
        passthrough: true,
      },
      {
        name: 'extraArgs',
        description: 'Extra args',
        type: 'array',
        passthrough: true,
      },
    ];

    const args = {
      _: ['test'],
      $0: 'ng',
      '--': ['--update'],
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await expectAsync(command.handler(args)).toBeRejectedWithError(
      CommandModuleError,
      "The '@angular/build:unit-test' builder schema defines multiple options with 'x-passthrough'.",
    );
    expect(command.scheduledOptions).toBeUndefined();
  });

  it('rejects "--" arguments when the x-passthrough option is not an array', async () => {
    const command = new TestArchitectCommand(createCommandContext());
    command.builderOptions = [
      {
        name: 'runnerArg',
        description: 'Runner arg',
        type: 'string',
        passthrough: true,
      },
    ];

    const args = {
      _: ['test'],
      $0: 'ng',
      '--': ['--update'],
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await expectAsync(command.handler(args)).toBeRejectedWithError(
      CommandModuleError,
      "The '@angular/build:unit-test' builder option 'runnerArg' has 'x-passthrough' enabled but is not an array.",
    );
    expect(command.scheduledOptions).toBeUndefined();
  });

  it('wraps a scalar existing option value before "--" passthrough arguments', async () => {
    const command = new TestArchitectCommand(createCommandContext());
    command.builderOptions = [
      {
        name: 'runnerArgs',
        description: 'Runner args',
        type: 'array',
        passthrough: true,
      },
    ];

    const args = {
      _: ['run'],
      $0: 'ng',
      'runner-args': '--shard=1/2',
      '--': ['--update'],
    } as unknown as ArgumentsCamelCase<{}> & OtherOptions;

    await command.handler(args);

    expect(command.scheduledOptions).toEqual({
      runnerArgs: ['--shard=1/2', '--update'],
    });
  });
});
