/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { StatsCompilation } from 'webpack';
import { Budget, Type } from '../builders/browser/schema';
import { ThresholdSeverity, checkBudgets } from './bundle-calculator';

const KB = 1024;

describe('bundle-calculator', () => {
  describe('checkBudgets()', () => {
    it('yields maximum budgets exceeded', () => {
      const budgets: Budget[] = [
        {
          type: Type.Any,
          maximumError: '1kb',
        },
      ];
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'foo.js',
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
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'bar.js',
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
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'foo',
        message: jasmine.stringMatching('foo exceeded maximum budget.'),
      });
    });

    it('yields exceeded initial budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.Initial,
          maximumError: '1kb',
        },
      ];
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'bundle initial',
        message: jasmine.stringMatching('initial exceeded maximum budget.'),
      });
    });

    it('yields exceeded total scripts budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.AllScript,
          maximumError: '1kb',
        },
      ];
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'total scripts',
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
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'total',
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
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(0);
    });

    it('yields exceeded individual script budget', () => {
      const budgets: Budget[] = [
        {
          type: Type.AnyScript,
          maximumError: '1kb',
        },
      ];
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'foo.js',
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
      const stats = {
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
      } as unknown as StatsCompilation;

      const failures = Array.from(checkBudgets(budgets, stats));

      expect(failures.length).toBe(1);
      expect(failures).toContain({
        severity: ThresholdSeverity.Error,
        label: 'foo.ext',
        message: jasmine.stringMatching('foo.ext exceeded maximum budget.'),
      });
    });
  });
});
