import * as mockFs from 'mock-fs';
import {stripIndents} from 'common-tags';
import {expect} from 'chai';

import {findLazyModules} from '../../addon/ng2/models/find-lazy-modules';


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
    expect(findLazyModules('project-root')).to.eql([
      'moduleA',
      'moduleB',
      'moduleC',
      'app/+workspace/+settings/settings.module'
    ]);
  });
});
