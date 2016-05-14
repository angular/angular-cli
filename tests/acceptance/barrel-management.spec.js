'use strict';

var expect = require('chai').expect;
var path = require('path');
var addBarrelRegistration = require('../../addon/ng2/utilities/barrel-management');
var mockFs = require('mock-fs');
var existsSync = require('exists-sync');
var EOL = require('os').EOL;

var Blueprint = require('ember-cli/lib/models/blueprint');

describe('barrel-management', () => {
  var blueprint;
  var installationDirectory;

  beforeEach(() => {
    blueprint = new Blueprint('/');
    blueprint.project = {
      root: '/'
    }
  });

  describe('when not shared', () => {


    beforeEach(() => {
      var mockDrive = {
        '/src/app/my-component': {}
      };
      mockFs(mockDrive);

      installationDirectory = path.join('src', 'app', 'my-component');
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('should do nothing', () => {
      return addBarrelRegistration(blueprint, installationDirectory).then(() => {
        var barrelPath = path.join(installationDirectory, 'index.ts');
        expect(existsSync(barrelPath)).to.equal(false);
      });
    });
  });

  describe('no pre-existing barrel', () => {

    beforeEach(() => {
      var mockDrive = {
        '/src/app/shared/my-component': {}
      };
      mockFs(mockDrive);

      installationDirectory = path.join('/src/app/shared/my-component');
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('create barrel from installation dir', () => {
      return addBarrelRegistration(blueprint, installationDirectory).then(() => {
        var fs = require('fs');
        var barrelPath = path.join(installationDirectory, '..', 'index.ts');
        expect(existsSync(barrelPath)).to.equal(true);
        var contents = fs.readFileSync(barrelPath, 'utf8');
        var expectedContents = `export * from './my-component';${EOL}`;
        expect(contents).to.equal(expectedContents);
      });
    });

    it('create barrel from installation dir with file name', () => {
      return addBarrelRegistration(blueprint, installationDirectory, 'my-smaller-component').then(() => {
        var fs = require('fs');
        var barrelPath = path.join(installationDirectory, '..', 'index.ts');
        expect(existsSync(barrelPath)).to.equal(true);
        var contents = fs.readFileSync(barrelPath, 'utf8');
        var expectedContents = `export * from './my-component/my-smaller-component';${EOL}`;
        expect(contents).to.equal(expectedContents);
      });
    });

  });

  describe('pre-existing barrel', () => {

    beforeEach(() => {
      var mockDrive = {
        '/src/app/shared': {
          'my-component': {},
          'index.ts': `export * from './another-component${EOL}export * from './other-component${EOL}`
        }
      };
      mockFs(mockDrive);

      installationDirectory = path.join('/src/app/shared/my-component');
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('update barrel from installation dir', () => {
      return addBarrelRegistration(blueprint, installationDirectory).then(() => {
        var fs = require('fs');
        var barrelPath = path.join(installationDirectory, '..', 'index.ts');
        expect(existsSync(barrelPath)).to.equal(true);
        var contents = fs.readFileSync(barrelPath, 'utf8');
        var expectedContents = `export * from './another-component${EOL}export * from './my-component';${EOL}export * from './other-component${EOL}`;
        expect(contents).to.equal(expectedContents);
      });
    });

    it('updateA barrel from installation dir with file name', () => {
      return addBarrelRegistration(blueprint, installationDirectory, 'my-smaller-component').then(() => {
        var fs = require('fs');
        var barrelPath = path.join(installationDirectory, '..', 'index.ts');
        expect(existsSync(barrelPath)).to.equal(true);
        var contents = fs.readFileSync(barrelPath, 'utf8');
        var expectedContents = `export * from './another-component${EOL}export * from './my-component/my-smaller-component';${EOL}export * from './other-component${EOL}`;
        expect(contents).to.equal(expectedContents);
      });
    });

  });

  describe('pre-existing barrel with export already defined', () => {

    beforeEach(() => {
      var mockDrive = {
        '/src/app/shared': {
          'my-component': {},
          'index.ts': `export * from './other-component${EOL}export * from './my-component';${EOL}export * from './another-component${EOL}export * from './my-component/my-smaller-component';${EOL}`
        }
      };
      mockFs(mockDrive);

      installationDirectory = path.join('/src/app/shared/my-component');
    });

    afterEach(() => {
      mockFs.restore();
    });

    it('update barrel from installation dir should add nothing', () => {
      return addBarrelRegistration(blueprint, installationDirectory).then(() => {
        var fs = require('fs');
        var barrelPath = path.join(installationDirectory, '..', 'index.ts');
        expect(existsSync(barrelPath)).to.equal(true);
        var contents = fs.readFileSync(barrelPath, 'utf8');
        var expectedContents = `export * from './another-component${EOL}export * from './my-component';${EOL}export * from './my-component/my-smaller-component';${EOL}export * from './other-component${EOL}`;
        expect(contents).to.equal(expectedContents);
      });
    });

    it('update barrel from installation dir with file name should add nothing', () => {
      return addBarrelRegistration(blueprint, installationDirectory, 'my-smaller-component').then(() => {
        var fs = require('fs');
        var barrelPath = path.join(installationDirectory, '..', 'index.ts');
        expect(existsSync(barrelPath)).to.equal(true);
        var contents = fs.readFileSync(barrelPath, 'utf8');
        var expectedContents = `export * from './another-component${EOL}export * from './my-component';${EOL}export * from './my-component/my-smaller-component';${EOL}export * from './other-component${EOL}`;
        expect(contents).to.equal(expectedContents);
      });
    });

  });
});
