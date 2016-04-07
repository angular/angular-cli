'use strict';

var expect = require('chai').expect;
var path = require('path');
var dynamicPathParser = require('../../addon/ng2/utilities/dynamic-path-parser');

var appDir = `${path.sep}src${path.sep}client${path.sep}app`;

describe('dynamic path parser', () => {
  var project;
  var entityName = 'temp-name';
  beforeEach(() => {
    project = { root: process.cwd() }
  });

  it('parse from proj root dir', () => {
    process.env.PWD = process.cwd();
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it('parse from proj src dir', () => {
    process.env.PWD = path.join(process.cwd(), 'src');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client dir`, () => {
    process.env.PWD = path.join(process.cwd(), 'src', 'client');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app dir`, () => {
    process.env.PWD = path.join(process.cwd(), 'src', 'client', 'app');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir`, () => {
    process.env.PWD = path.join(process.cwd(), 'src', 'client', 'app', 'child-dir');
    var result = dynamicPathParser(project, entityName);
    expect(result.dir).to.equal(`${appDir}${path.sep}child-dir`);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir w/ ..${path.sep}`, () => {
    process.env.PWD = path.join(process.cwd(), 'src', 'client', 'app', 'child-dir');
    var result = dynamicPathParser(project, '..' + path.sep + entityName);
    expect(result.dir).to.equal(appDir);
    expect(result.name).to.equal(entityName);
  });

  it(`parse from proj src${path.sep}client${path.sep}app${path.sep}child-dir${path.sep}grand-child-dir w/ ..${path.sep}`,
    () => {
      process.env.PWD = path.join(process.cwd(), 'src', 'client', 'app', 'child-dir', 'grand-child-dir');
      var result = dynamicPathParser(project, '..' + path.sep + entityName);
      expect(result.dir).to.equal(`${appDir}${path.sep}child-dir`);
      expect(result.name).to.equal(entityName);
    });
});
