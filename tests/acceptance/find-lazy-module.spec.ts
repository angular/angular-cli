import * as mockFs from 'mock-fs';
import {stripIndents} from 'common-tags';
import {expect} from 'chai';
import {join} from 'path';

import {findLazyModules} from 'universal-cli/models/find-lazy-modules';


describe('find-lazy-module', () => {
  beforeEach(() => {
    mockFs({
      'project-root': {
        'fileA.ts': stripIndents`
          const r1 = {
            "loadChildren": "moduleA"
          };
          const r2 = {
            loadChildren: "moduleB"
          };
          const r3 = {
            'loadChildren': 'moduleC'
          };
          const r4 = {
            "loadChildren": 'app/+workspace/+settings/settings.module#SettingsModule'
          };
          const r5 = {
            loadChildren: 'unexistentModule'
          };
        `,
        // Create those files too as they have to exist.
        'moduleA.ts': '',
        'moduleB.ts': '',
        'moduleC.ts': '',
        'moduleD.ts': '',
        'app': { '+workspace': { '+settings': { 'settings.module.ts': '' } } }
      }
    });
  });
  afterEach(() => mockFs.restore());

  it('works', () => {
    expect(findLazyModules('project-root')).to.eql({
      'moduleA': join(process.cwd(), 'project-root', 'moduleA.ts'),
      'moduleB': join(process.cwd(), 'project-root', 'moduleB.ts'),
      'moduleC': join(process.cwd(), 'project-root', 'moduleC.ts'),
      'app/+workspace/+settings/settings.module':
          join(process.cwd(), 'project-root', 'app/+workspace/+settings/settings.module.ts'),
    });
  });
});
