'use strict';

var expect = require('chai').expect;
var path = require('path');
var dynamicPathParser = require('../../addon/ng2/utilities/dynamic-path-parser');
var mockFs = require('mock-fs');

var appDir = `src${path.sep}app`;

describe('dynamic path parser', () => {
  var project;
  var entityName = 'temp-name';
  var rootName = path.parse(process.cwd()).root + 'project';
  var sourceDir = 'src';
  beforeEach(() => {
    project = {
      root: rootName, 
      ngConfig: {
        defaults: {
          sourceDir: sourceDir
        }
      } 
    };
    var mockFolder = {};
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
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it('parse from proj src dir', () => {
    process.env.PWD = path.join(project.root, 'src');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client dir`, () => {
    process.env.PWD = path.join(project.root, 'src', 'client');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app dir`, () => {
    process.env.PWD = path.join(project.root, 'src', 'client', 'app');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir`, () => {
    var mockFolder = {};
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
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(`${appDir}${path.sep}child-dir`);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir w/ ..${path.sep}`, () => {
    var mockFolder = {};
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
    var result = dynamicPathParser(project, '..' + path.sep + entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir${path.sep}grand-child-dir w/ ..${path.sep}`,
    () => {
      var mockFolder = {};
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
      var result = dynamicPathParser(project, '..' + path.sep + entityName);
      expect(result.dir).to.equal(`${appDir}${path.sep}child-dir`);
      expect(result.name).to.equal(entityName);
    });
    
  it('auto look for dirs with a "+" when not specified', () => {
    var mockFolder = {};
    mockFolder[rootName] = {
      src: {
        app: {
          '+my-route': {}
        }
      }
    };
    mockFs(mockFolder);
    process.env.PWD = path.join(project.root, 'src', 'app', 'my-route');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(`${appDir}${path.sep}+my-route`);
    expect(result.name).to.equal(entityName);
  });
});
