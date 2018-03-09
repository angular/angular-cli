import * as path from 'path';
import { calculateBytes, calculateSizes } from '@angular/cli/utilities/bundle-calculator';
import mockFs = require('mock-fs');


describe('bundle calculator', () => {
  describe('calculateBytes', () => {
    const kb = (n: number) => n * 1000;
    const mb = (n: number) => n * 1000 * 1000;
    const scenarios: any[] = [
      { expect: 1, val: '1' },
      { expect: 1, val: '1b' },
      { expect: kb(1), val: '1kb' },
      { expect: mb(1), val: '1mb' },
      { expect: 110, val: '100b', baseline: '10', factor: 'pos' },
      { expect: 110, val: '100b', baseline: '10b', factor: 'pos' },
      { expect: 90, val: '100b', baseline: '10', factor: 'neg' },
      { expect: 90, val: '100b', baseline: '10b', factor: 'neg' },
      { expect: 15, val: '50%', baseline: '10', factor: 'pos' },
      { expect: 5, val: '50%', baseline: '10', factor: 'neg' },
      { expect: kb(50) + mb(1), val: '50kb', baseline: '1mb', factor: 'pos' },
      { expect: mb(1.25), val: '25%', baseline: '1mb', factor: 'pos' },
      { expect: mb(0.75), val: '25%', baseline: '1mb', factor: 'neg' },
    ];
    scenarios.forEach(s => {
      const specMsg = `${s.val} => ${s.expect}`;
      const baselineMsg = s.baseline ? ` (baseline: ${s.baseline})` : ``;
      const factor = s.factor ? ` (factor: ${s.factor})` : ``;
      it(`should calculateBytes ${specMsg}${baselineMsg}${factor}`, () => {
        const result = calculateBytes(s.val, s.baseline, s.factor);
        expect(s.expect).toEqual(result);
      });
    });
  });

  describe('calculateSizes', () => {
    let compilation: any;
    beforeEach(() => {
      compilation = {
        assets: {
          'asset1.js': { size: () => 1 },
          'asset2': { size: () => 2 },
          'asset3.js': { size: () => 4 },
          'asset4': { size: () => 8 },
          'asset5': { size: () => 16 },
        },
        chunks: [
          { name: 'chunk1', files: ['asset1.js'], isInitial: true },
          { name: 'chunk2', files: ['asset2'], isInitial: false },
          { name: 'chunk3', files: ['asset3.js', 'asset4'], isInitial: false }
        ]
      };
    });

    const scenarios: any[] = [
      { expect: [{size: 31, label: 'total'}], budget: { type: 'all' } },
      { expect: [{size: 5, label: 'total scripts'}], budget: { type: 'allScript' } },
      { expect: [
          {size: 1, label: 'asset1.js'},
          {size: 2, label: 'asset2'},
          {size: 4, label: 'asset3.js'},
          {size: 8, label: 'asset4'},
          {size: 16, label: 'asset5'},
        ], budget: { type: 'any' } },
        { expect: [
            {size: 1, label: 'asset1.js'},
            {size: 4, label: 'asset3.js'},
          ], budget: { type: 'anyScript' } },
      { expect: [{size: 2, label: 'chunk2'}], budget: { type: 'bundle', name: 'chunk2' } },
      { expect: [{size: 12, label: 'chunk3'}], budget: { type: 'bundle', name: 'chunk3' } },
      { expect: [{size: 1, label: 'initial'}], budget: { type: 'initial' } },
    ];

    scenarios.forEach(s => {
      const budgetName = s.budget.name ? ` (${s.budget.name})` : '';
      it(`should calulate sizes for ${s.budget.type}${budgetName}`, () => {
        const sizes = calculateSizes(s.budget, compilation);
        expect(sizes.length).toEqual(s.expect.length);
        for (let i = 0; i < sizes.length; i++) {
          expect(sizes[i].size).toEqual((s.expect[i].size));
          expect(sizes[i].label).toEqual((s.expect[i].label));
        }
      });
    });
  });
});
