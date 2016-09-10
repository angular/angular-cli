import * as utils from './build-utils';
import * as ts from 'typescript';

const modules = [
  'broccoli-prerender',
  'express-engine',
  'grunt-prerender',
  'gulp-prerender',
  'hapi-engine',
  'universal-polyfills',
  'universal',
  'webpack-prerender'
];

const publishedModuleNames = [
  'angular2-broccoli-prerender',
  'angular2-express-engine',
  'angular2-grunt-prerender',
  'angular2-gulp-prerender',
  'angular2-hapi-engine',
  'angular2-universal',
  'angular2-universal-polyfills',
  'angular2-webpack-prerender'
];

const sampleRootPackage = {
  version: '1.0.0',
  devDependencies: {
    'jasmine': '2.0.0',
    '@angular/core': '2.0.0-rc.4'
  },
  dependencies: {
    '@angular/compiler': '2.0.0-rc.4'
  }
};

const flattenedDeps = {
  '@angular/compiler': '2.0.0-rc.6',
  '@angular/core': '2.0.0-rc.6',
  'jasmine': '2.0.0',
  'angular2-broccoli-prerender': '~1.0.0',
  'angular2-express-engine': '~1.0.0',
  'angular2-grunt-prerender': '~1.0.0',
  'angular2-gulp-prerender': '~1.0.0',
  'angular2-hapi-engine': '~1.0.0',
  'angular2-universal-polyfills': '~1.0.0',
  'angular2-universal': '~1.0.0',
  'angular2-webpack-prerender': '~1.0.0'
};

const config = require('./tsconfig.json');

describe('build-utils', () => {
  describe('getAllModules()', () => {
    it('should return a list of modules', () => {
      expect(utils.getAllModules().sort()).toEqual(modules.sort());
    });
  });

  describe('getCompilerOptions', () => {
    it('should return parsed compiler options', () => {
      let parsed = utils.getCompilerOptions(config);
      expect(parsed.target).toBe(ts.ScriptTarget.ES5);
    });
  });

  describe('getPublishedModuleNames()', () => {
    it('should prepend angular2 to modules as appropriate', () => {
      expect(utils.getPublishedModuleNames(modules)).toEqual(publishedModuleNames);
    });
  });

  describe('getTargetFiles()', () => {
    it('should return just config files if --test and --module flags are NOT provided', () => {
      expect(utils.getTargetFiles(false, '', config)).toEqual(config.files);
    });

    it('should return all config files plus spec if --test but NOT --module flag is provided', () => {
      expect(utils.getTargetFiles(true, '', config).length).toBeGreaterThan(config.files.length);
    });

    it('should return filtered config files plus spec if --test AND --module flag are provided', () => {
      let universalFiles = config.files.filter(f => /^modules\/universal\//.test(f));
      expect(utils.getTargetFiles(true, 'universal', config).length).toBeGreaterThan(universalFiles.length);
    });
  });

  describe('getRootDependencies()', () => {
    it('should return a flattened map of all kinds of dependencies', () => {
      expect(utils.getRootDependencies(sampleRootPackage, publishedModuleNames)).toEqual(flattenedDeps);
    });
  });

  describe('getSrcFromPath', () => {
    it('should strip /src/ from the path', () => {
      expect(utils.stripSrcFromPath({dirname: 'modules/universal/src/index.js'}))
        .toEqual({dirname: 'modules/universal/index.js'});
      expect(utils.stripSrcFromPath({dirname: 'modules/grunt-prerender/tasks/index.js'}))
        .toEqual({dirname: 'modules/grunt-prerender/tasks/index.js'});
    });
  });
});
