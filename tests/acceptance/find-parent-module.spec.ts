'use strict';

const mockFs = require('mock-fs');

import * as ts from 'typescript';
import * as path from 'path';
import * as dependentFilesUtils from '@angular/cli/utilities/get-dependent-files';

import { expect } from 'chai';
import findParentModule from '@angular/cli/utilities/find-parent-module';

describe('findParentModule', () => {
  const project = {
    root: 'project',
    ngConfig: {
      apps: [
        { root: 'src' },
      ],
    },
  };

  const mockDrive = {
    'project': {
      'src': {
        'app': {
          'app.module.ts': ``,
          'app.routing.module.ts': ``,
          'component': {},
          'child-module': {
            'child-module.module.ts': ``,
            'child-module.routing.module.ts': ``,
            'child-module-component': {},
          },
          'router-module': {
            'router-module.routing.module.ts': ``
          }
        },
        'myapp': {
          'myapp.module.ts': ``,
          'myapp.routing.module.ts': ``,
          'component': {},
          'child-module': {
            'child-module.module.ts': ``,
            'child-module.routing.module.ts': ``,
            'child-module-component': {},
          },
          'router-module': {
            'router-module.routing.module.ts': ``
          }
        }
      }
    }
  }

  const apps = [
    { root: 'src',  subfolder: 'app' },
    { root: 'src',  subfolder: 'myapp' }
  ];

  beforeEach(() => {
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('Finds parent module', () => {
    it('throws and error if not in an application folder', () => {
      let currentDir = '';
      expect(() => {
        let parentModule = findParentModule(project, currentDir);
        // if for some reason it doesn't throw.. expect undefined
        // in hopes of logging something useful.
        expect(parentModule).to.equal(undefined);
      }).to.throw();
    });

    apps.forEach((app) => { testApp(app)});
  });

  function testApp(app: Object) {
    describe('module in folder '+ app.subfolder, () => {
      it('works for root folder', () => {
        let currentDir = path.join(app.root, app.subfolder);
        expect(() => {
          let parentModule = findParentModule(project, currentDir);
          expect(parentModule).to.equal(path.join(project.root, app.root, app.subfolder, app.subfolder +'.module.ts'));
        }).to.not.throw();
      });

      it('works from an app component folder', () => {
        let currentDir = path.join(app.root, app.subfolder, 'component');
        expect(() => {
          let parentModule = findParentModule(project, currentDir);
          expect(parentModule).to.equal(path.join(project.root, app.root, app.subfolder, app.subfolder +'.module.ts'));
        }).to.not.throw();
      });

      it('ignores router modules', () => {
          let currentDir = path.join(app.root, app.subfolder, 'router-module');
          expect(() => {
            let parentModule = findParentModule(project, currentDir);
            expect(parentModule).to.equal(path.join(project.root, app.root, app.subfolder, app.subfolder + '.module.ts'));
          }).to.not.throw();
      });

      it('works from a child module', () => {
        let currentDir = path.join(app.root, app.subfolder, 'child-module');
        expect(() => {
          let parentModule = findParentModule(project, currentDir);
          expect(parentModule).to.equal(path.join(project.root, app.root, app.subfolder, 'child-module', 'child-module.module.ts'));
        }).to.not.throw();
      });

      it('works from a component of a child module', () => {
        let currentDir = path.join(app.root, app.subfolder, 'child-module', 'child-module-component');
        expect(() => {
          let parentModule = findParentModule(project, currentDir);
          expect(parentModule).to.equal(path.join(project.root, app.root, app.subfolder, 'child-module', 'child-module.module.ts'));
        }).to.not.throw();
      });
    });
  }

});
