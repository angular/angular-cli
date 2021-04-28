/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { StatsCompilation } from 'webpack';
import { Budget, Type } from '../browser/schema';
import { ThresholdSeverity, checkBudgets } from './bundle-calculator';
import { ProcessBundleResult } from './process-bundle';

const KB = 1024;

// tslint:disable-next-line: no-big-function
describe('bundle-calculator', () => {
  // tslint:disable-next-line: no-big-function
  describe('checkBudgets()', () => {
    it('yields maximum budgets exceeded', () => {
      const budgets: Budget[] = [
        {
          type: Type.Any,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [],
        assets: [
          {
            name: 'foo.js',
            size: 1.5 * KB,
          },
          {
            name: 'bar.js',
            size: 0.5 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('foo.js exceeded maximum budget.'),
      });
    });

    it('yields minimum budgets exceeded', () => {
      const budgets: Budget[] = [
        {
          type: Type.Any,
          minimumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [],
        assets: [
          {
            name: 'foo.js',
            size: 1.5 * KB,
          },
          {
            name: 'bar.js',
            size: 0.5 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('bar.js failed to meet minimum budget.'),
      });
    });

    it('yields exceeded bundle budgets', () => {
      const budgets: Budget[] = [
        {
          type: Type.Bundle,
          name: 'foo',
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [
          {
            name: 'foo.js',
            size: 0.75 * KB,
          },
          {
            name: 'bar.js',
            size: 0.75 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('foo exceeded maximum budget.'),
      });
    });

    it('yields exceeded differential bundle budgets', () => {
      const budgets: Budget[] = [
        {
          type: Type.Bundle,
          name: 'foo',
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [],
      } as unknown) as StatsCompilation;

      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          original: {
            filename: 'foo-es2015.js',
            size: 1.25 * KB,
          },
          downlevel: {
            filename: 'foo-es5.js',
            size: 1.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      expect(failures.length).toBe(2);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('bundle foo-es2015 exceeded maximum budget.'),
      });
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('bundle foo-es5 exceeded maximum budget.'),
      });
    });

    it('does *not* yield a combined differential bundle budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Bundle,
          name: 'foo',
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: 'foo-es2015.js',
            size: 0.5 * KB,
          },
          downlevel: {
            filename: 'foo-es5.js',
            size: 0.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      // Because individual builds are under budget, they are acceptable. Should
      // **not** yield a combined build which is over budget.
      expect(failures.length).toBe(0);
    });

    it('yields exceeded initial budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Initial,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [
          {
            name: 'foo.js',
            size: 0.5 * KB,
          },
          {
            name: 'bar.js',
            size: 0.75 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('initial exceeded maximum budget.'),
      });
    });

    it('yields exceeded differential initial budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Initial,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: 'initial-es2017.js',
            size: 1.25 * KB,
          },
          downlevel: {
            filename: 'initial-es5.js',
            size: 1.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      expect(failures.length).toBe(2);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('bundle initial-es2017 exceeded maximum budget.'),
      });
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('bundle initial-es5 exceeded maximum budget.'),
      });
    });

    it('does *not* yield a combined differential initial budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Initial,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: 'initial-es2015.js',
            size: 0.5 * KB,
          },
          downlevel: {
            filename: 'initial-es5.js',
            size: 0.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      // Because individual builds are under budget, they are acceptable. Should
      // **not** yield a combined build which is over budget.
      expect(failures.length).toBe(0);
    });

    it('yields exceeded total scripts budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.AllScript,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [
          {
            name: 'foo.js',
            size: 0.75 * KB,
          },
          {
            name: 'bar.js',
            size: 0.75 * KB,
          },
          {
            name: 'baz.css',
            size: 1.5 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('total scripts exceeded maximum budget.'),
      });
    });

    it('yields exceeded total budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.All,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js', 'bar.css'],
          },
        ],
        assets: [
          {
            name: 'foo.js',
            size: 0.75 * KB,
          },
          {
            name: 'bar.css',
            size: 0.75 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('total exceeded maximum budget.'),
      });
    });

    it('skips component style budgets', () => {
      const budgets: Budget[] = [
        {
          type: Type.AnyComponentStyle,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.css', 'bar.js'],
          },
        ],
        assets: [
          {
            name: 'foo.css',
            size: 1.5 * KB,
          },
          {
            name: 'bar.js',
            size: 0.5 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(0);
    });

    it('yields exceeded individual script budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.AnyScript,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js', 'bar.js'],
          },
        ],
        assets: [
          {
            name: 'foo.js',
            size: 1.5 * KB,
          },
          {
            name: 'bar.js',
            size: 0.5 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('foo.js exceeded maximum budget.'),
      });
    });

    it('yields exceeded individual file budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Any,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.ext', 'bar.ext'],
          },
        ],
        assets: [
          {
            name: 'foo.ext',
            size: 1.5 * KB,
          },
          {
            name: 'bar.ext',
            size: 0.5 * KB,
          },
        ],
      } as unknown) as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats, [] /* processResults */));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        message: jasmine.stringMatching('foo.ext exceeded maximum budget.'),
      });
    });

    it('does *not* yield a combined differential bundle budget for any script', () => {
      const budgets: Budget[] = [
        {
          type: Type.AnyScript,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js'],
          },
        ],
        assets: [
          {
            name: 'main-es2015.js',
            size: 1.25 * KB,
          },
        ],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: '/home/main-es2015.js',
            size: 0.5 * KB,
          },
          downlevel: {
            filename: '/home/main-es5.js',
            size: 0.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      // Because individual builds are under budget, they are acceptable. Should
      // **not** yield a combined build which is over budget.
      expect(failures.length).toBe(0);
    });

    it('does *not* yield a combined differential bundle budget for all script', () => {
      const budgets: Budget[] = [
        {
          type: Type.AllScript,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js'],
          },
        ],
        assets: [
          {
            name: 'main-es2015.js',
            size: 1.25 * KB,
          },
        ],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: '/home/main-es2015.js',
            size: 0.5 * KB,
          },
          downlevel: {
            filename: '/home/main-es5.js',
            size: 0.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      // Because individual builds are under budget, they are acceptable. Should
      // **not** yield a combined build which is over budget.
      expect(failures.length).toBe(0);
    });

    it('does *not* yield a combined differential bundle budget for total budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.All,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js'],
          },
        ],
        assets: [
          {
            name: 'main-es2015.js',
            size: 1.25 * KB,
          },
        ],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: '/home/main-es2015.js',
            size: 0.5 * KB,
          },
          downlevel: {
            filename: '/home/main-es5.js',
            size: 0.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      // Because individual builds are under budget, they are acceptable. Should
      // **not** yield a combined build which is over budget.
      expect(failures.length).toBe(0);
    });

    it('does *not* yield a combined differential bundle budget for individual file budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Any,
          maximumError: '1kb',
        },
      ];
      const stats = ({
        chunks: [
          {
            id: 0,
            initial: true,
            names: ['foo'],
            files: ['foo.js'],
          },
        ],
        assets: [
          {
            name: 'main-es2015.js',
            size: 1.25 * KB,
          },
        ],
      } as unknown) as StatsCompilation;
      const processResults: ProcessBundleResult[] = [
        {
          name: '0',
          // Individual builds are under budget, but combined they are over.
          original: {
            filename: '/home/main-es2015.js',
            size: 0.5 * KB,
          },
          downlevel: {
            filename: '/home/main-es5.js',
            size: 0.75 * KB,
          },
        },
      ];

      const failures = Array.from(checkBudgets(budgets, stats, processResults));

      // Because individual builds are under budget, they are acceptable. Should
      // **not** yield a combined build which is over budget.
      expect(failures.length).toBe(0);
    });
  });
});
