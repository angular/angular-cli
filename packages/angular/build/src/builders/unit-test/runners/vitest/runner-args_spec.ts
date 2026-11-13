/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type VitestCliParser, parseRunnerArgs } from './runner-args';

describe('parseRunnerArgs', () => {
  let parseCLI: VitestCliParser;

  beforeAll(async () => {
    // Use the actual Vitest parser to ensure the validation matches its behavior.
    ({ parseCLI } = await import('vitest/node'));
  });

  function parse(...runnerArgs: string[]) {
    return parseRunnerArgs(runnerArgs, parseCLI);
  }

  describe('supported options', () => {
    it('should return no options when no arguments are provided', () => {
      expect(parse()).toEqual({ cli: {}, project: {} });
    });

    it('should support a boolean option', () => {
      expect(parse('--update')).toEqual({ cli: { update: true }, project: { update: true } });
    });

    it('should support a negated boolean option', () => {
      expect(parse('--no-update').cli).toEqual({ update: false });
    });

    it('should support the alias of an option', () => {
      expect(parse('-u')).toEqual({ cli: { update: true }, project: { update: true } });
    });

    it('should support a kebab case option name', () => {
      expect(parse('--disable-console-intercept').cli).toEqual({ disableConsoleIntercept: true });
    });

    it('should support the named update modes', () => {
      expect(parse('--update=all').cli).toEqual({ update: 'all' });
      expect(parse('--update=new').cli).toEqual({ update: 'new' });
      expect(parse('--update=none').cli).toEqual({ update: 'none' });
    });

    it('should support a numeric value provided with an equals sign', () => {
      expect(parse('--bail=1').cli).toEqual({ bail: 1 });
    });

    it('should support a numeric value provided as a separate argument', () => {
      expect(parse('--bail', '1').cli).toEqual({ bail: 1 });
    });

    it('should support multiple options', () => {
      expect(parse('--retry=2', '--testTimeout=10000', '--allowOnly').cli).toEqual({
        retry: 2,
        testTimeout: 10000,
        allowOnly: true,
      });
    });

    it('should support a worker count or percentage', () => {
      expect(parse('--maxWorkers=2').cli).toEqual({ maxWorkers: 2 });
      expect(parse('--maxWorkers=50%').cli).toEqual({ maxWorkers: '50%' });
    });

    it('should support the sequence shuffle and seed options', () => {
      const expected = { sequence: { shuffle: true, seed: 42 } };

      expect(parse('--sequence.shuffle', '--sequence.seed=42')).toEqual({
        cli: expected,
        project: expected,
      });
    });

    it('should only provide the shard option to the CLI options', () => {
      expect(parse('--shard=1/3')).toEqual({ cli: { shard: '1/3' }, project: {} });
    });

    it('should not modify the provided arguments', () => {
      const runnerArgs = Object.freeze(['--update', '--bail=1']);

      expect(parseRunnerArgs(runnerArgs, parseCLI).cli).toEqual({ update: true, bail: 1 });
      expect(runnerArgs).toEqual(['--update', '--bail=1']);
    });
  });

  describe('unsupported values', () => {
    it('should reject an unknown option', () => {
      expect(() => parse('--updat')).toThrowError(/The Vitest "--updat" option is not supported\./);
    });

    it('should list the supported options', () => {
      expect(() => parse('--unknown')).toThrowError(/Supported Vitest options: .*--update/);
    });

    it('should reject an option name that is an inherited object property', () => {
      expect(() => parse('--toString')).toThrowError(/"runnerArgs" option/);
    });

    it('should reject an invalid value for a supported option', () => {
      expect(() => parse('--bail=abc')).toThrowError(
        /The Vitest "--bail" option requires a non-negative integer\./,
      );
      expect(() => parse('--bail')).toThrowError(
        /The Vitest "--bail" option requires a non-negative integer\./,
      );
      expect(() => parse('--update=other')).toThrowError(
        /The Vitest "--update" option requires a boolean, "all", "new", or "none"\./,
      );
      expect(() => parse('--maxWorkers=0')).toThrowError(
        /The Vitest "--maxWorkers" option requires a positive integer or a percentage\./,
      );
      expect(() => parse('--shard=1')).toThrowError(
        /The Vitest "--shard" option requires a value in the form of <index>\/<count>\./,
      );
    });

    it('should reject an unsupported nested sequence option', () => {
      expect(() => parse('--sequence.concurrent')).toThrowError(
        /The Vitest "--sequence" option requires only the following options: "--sequence.shuffle", "--sequence.seed"\./,
      );
    });

    it('should direct options with a builder equivalent to the builder option', () => {
      expect(() => parse('--reporter=dot')).toThrowError(
        /The Vitest "--reporter" option is not supported\. Use the "reporters" option instead\./,
      );
      expect(() => parse('--coverage.enabled')).toThrowError(
        /The Vitest "--coverage" option is not supported\. Use the "coverage" options instead\./,
      );
      expect(() => parse('--ui')).toThrowError(/Use the "ui" option instead\./);
      expect(() => parse('--isolate')).toThrowError(/Use the "isolate" option instead\./);
      expect(() => parse('--watch')).toThrowError(/Use the "watch" option instead\./);
      expect(() => parse('--config=vitest.config.ts')).toThrowError(
        /Use the "runnerConfig" option instead\./,
      );
    });

    it('should report the full option name when an unsupported alias is used', () => {
      expect(() => parse('-t', 'should work')).toThrowError(
        /The Vitest "--testNamePattern" option is not supported\. Use the "filter" option instead\./,
      );
    });

    it('should reject options that are managed by the builder', () => {
      expect(() => parse('--root=/other')).toThrowError(
        /The Vitest "--root" option is not supported\. The option is managed by the builder\./,
      );
      expect(() => parse('--project=other')).toThrowError(
        /The Vitest "--project" option is not supported\. The option is managed by the builder\./,
      );
    });

    it('should reject options that select tests based on changed files', () => {
      expect(() => parse('--changed')).toThrowError(
        /The Vitest "--changed" option is not supported\. Tests are executed from bundled output/,
      );
      expect(() => parse('--related=src/app/app.ts')).toThrowError(
        /The Vitest "--related" option is not supported\. Tests are executed from bundled output/,
      );
    });

    it('should reject test file filters', () => {
      expect(() => parse('src/app/app.spec.ts')).toThrowError(
        /Test file filters are not supported \("src\/app\/app\.spec\.ts"\)\. Use the "include" option instead\./,
      );
    });

    it('should reject arguments following a "--" separator', () => {
      expect(() => parse('--update', '--', 'src/app/app.spec.ts')).toThrowError(
        /Arguments following "--" are not supported \("src\/app\/app\.spec\.ts"\)\./,
      );
    });

    it('should reject Vitest commands', () => {
      expect(() => parse('bench')).toThrowError(/The Vitest "bench" command is not supported\./);
      expect(() => parse('--update', 'list')).toThrowError(
        /The Vitest "list" command is not supported\./,
      );
    });

    it('should not report a command name that follows a "--" separator as a command', () => {
      let message = '';
      try {
        parse('--update', '--', 'run');
      } catch (e) {
        message = (e as Error).message;
      }

      expect(message).toContain('Arguments following "--" are not supported ("run").');
      expect(message).not.toContain('command is not supported');
    });

    it('should only report a command once when it is also represented as an option', () => {
      let message = '';
      try {
        parse('run');
      } catch (e) {
        message = (e as Error).message;
      }

      expect(message).toContain('The Vitest "run" command is not supported.');
      expect(message).not.toContain('"--run"');
    });

    it('should report all unsupported values together', () => {
      let message = '';
      try {
        parse('--unknown', '--reporter=dot', 'src/app/app.spec.ts');
      } catch (e) {
        message = (e as Error).message;
      }

      expect(message).toContain('The "runnerArgs" option contains unsupported values:');
      expect(message).toContain('The Vitest "--unknown" option is not supported.');
      expect(message).toContain('The Vitest "--reporter" option is not supported.');
      expect(message).toContain('Test file filters are not supported');
    });
  });
});
