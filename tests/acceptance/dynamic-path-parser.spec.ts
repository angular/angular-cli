import * as path from 'path';
import { dynamicPathParser } from '@angular/cli/utilities/dynamic-path-parser';
import mockFs = require('mock-fs');

const appDir = `src${path.sep}app`;
const appConfig = {
  root: 'src'
};

describe('dynamic path parser', () => {
  let project: any;
  const entityName = 'temp-name';
  const rootName = path.parse(process.cwd()).root + 'project';
  const root = 'src';
  beforeEach(() => {
    project = {
      root: rootName,
      ngConfig: {
        apps: [{
          root: root
        }]
      }
    };
    const mockFolder: any = {};
    mockFolder[rootName] = {
      src: {
        app: {
          'index.html': '<html></html>',
          'temp-name': {}
        }
      }
    };
    mockFs(mockFolder);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('parse from proj root dir', () => {
    process.env.PWD = project.root;
    const options = {
      project,
      entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(appDir);
    expect(result.name).toBe(entityName);
  });

  it('parse from proj src dir', () => {
    process.env.PWD = path.join(project.root, 'src');
    const options = {
      project,
      entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(appDir);
    expect(result.name).toBe(entityName);
  });

  it(`parse from proj src${path.sep}client dir`, () => {
    process.env.PWD = path.join(project.root, 'src', 'client');
    const options = {
      project,
      entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(appDir);
    expect(result.name).toBe(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app dir`, () => {
    process.env.PWD = path.join(project.root, 'src', 'client', 'app');
    const options = {
      project,
      entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(appDir);
    expect(result.name).toBe(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir`, () => {
    const mockFolder: any = {};
    mockFolder[rootName] = {
      src: {
        app: {
          'index.html': '<html></html>',
          'child-dir': {
            'temp-name': {}
          }
        }
      }
    };
    mockFs(mockFolder);
    process.env.PWD = path.join(project.root, 'src', 'app', 'child-dir');
    const options = {
      project,
      entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(`${appDir}${path.sep}child-dir`);
    expect(result.name).toBe(entityName);
  });

  // tslint:disable-next-line:max-line-length
  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir w/ ..${path.sep}`, () => {
    const mockFolder: any = {};
    mockFolder[rootName] = {
      src: {
        app: {
          'index.html': '<html></html>',
          'child-dir': {},
          'temp-name': {}
        }
      }
    };
    mockFs(mockFolder);
    process.env.PWD = path.join(project.root, 'src', 'app', 'child-dir');
    const options = {
      project,
      entityName: '..' + path.sep + entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(appDir);
    expect(result.name).toBe(entityName);
  });

  // tslint:disable-next-line:max-line-length
  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir${path.sep}grand-child-dir w/ ..${path.sep}`,
    () => {
      const mockFolder: any = {};
      mockFolder[rootName] = {
        src: {
          app: {
            'index.html': '<html></html>',
            'child-dir': {
              'grand-child-dir': {},
              'temp-name': {}
            }
          }
        }
      };
      mockFs(mockFolder);
      process.env.PWD = path.join(project.root, 'src', 'app', 'child-dir', 'grand-child-dir');
      const options = {
        project,
        entityName: '..' + path.sep + entityName,
        appConfig,
        dryRun: false
      };
      const result = dynamicPathParser(options);
      expect(result.dir).toBe(`${appDir}${path.sep}child-dir`);
      expect(result.name).toBe(entityName);
    });

  it('auto look for dirs with a "+" when not specified', () => {
    const mockFolder: any = {};
    mockFolder[rootName] = {
      src: {
        app: {
          '+my-route': {}
        }
      }
    };
    mockFs(mockFolder);
    process.env.PWD = path.join(project.root, 'src', 'app', 'my-route');
    const options = {
      project,
      entityName,
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(`${appDir}${path.sep}+my-route`);
    expect(result.name).toBe(entityName);
  });

  it('create new dirs as dasherized', () => {
    process.env.PWD = project.root;
    const options = {
      project,
      entityName: path.join('NewDir', entityName),
      appConfig,
      dryRun: false
    };
    const result = dynamicPathParser(options);
    expect(result.dir).toBe(`${appDir}${path.sep}new-dir`);
    expect(result.name).toBe(entityName);
  });
});
