const mockFs = require('mock-fs');
const expect = require('chai').expect;
import * as path from 'path';
import {findLoadChildren, findLazyModules}  from 'universal-cli/models/find-lazy-modules';

describe('find-lazy-modules', () => {
  beforeEach(() => {
    let mockDrive = {
      'node_modules/feature-module': {
        'package.json': '{ "main": "index.js" }',
        'index.js': ''
      },
      'src/app': {
        'app.module.ts': `RouterModule.forRoot([
          { path: 'relative', loadChildren: './feature-a/feature-a.module' },
          { path: 'absolute', loadChildren: 'src/app/feature-b/feature-b.module' },
          { path: 'module', loadChildren: 'feature-module' },
          { path: 'module2', loadChildren: 'feature-module/index.js' },
          { path: 'invalid', loadChildren: 'invalid' }
        ]);`,
        'feature-a': {
          'feature-a.module.ts': ''
        },
        'feature-b': {
          'feature-b.module.ts': ''
        }
      }
    };
    mockFs(mockDrive);
  });
  afterEach(() => {
    mockFs.restore();
  });

  it('should find children', () => {
    let children = findLoadChildren('src/app/app.module.ts');
    expect(children.length).to.equal(5);
    expect(children.sort()).to.deep.equal([
      './feature-a/feature-a.module',
      'feature-module',
      'feature-module/index.js',
      'invalid',
      'src/app/feature-b/feature-b.module'
    ]);
  });

  it('should find lazy modules', () => {
    let modules = findLazyModules('.');
    expect(modules).to.deep.equal({
      './feature-a/feature-a.module':
        path.join(__dirname, '../../src/app/feature-a/feature-a.module.ts'),
      'src/app/feature-b/feature-b.module':
        path.join(__dirname, '../../src/app/feature-b/feature-b.module.ts'),
      'feature-module':
        path.join(__dirname, '../../node_modules/feature-module/index.js'),
      'feature-module/index.js':
        path.join(__dirname, '../../node_modules/feature-module/index.js')
    });
  });
});
