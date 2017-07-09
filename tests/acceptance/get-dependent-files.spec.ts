// mock-fs needs to be first so fs module can be mocked correctly.
import mockFs = require('mock-fs');

import * as path from 'path';
import * as ts from 'typescript';
import * as dependentFilesUtils from '@angular/cli/utilities/get-dependent-files';

describe('Get Dependent Files: ', () => {
  let rootPath = 'src/app';

  beforeEach(() => {
    let mockDrive = {
      'src/app': {
        'foo': {
          'foo.component.ts': `import * from '../bar/baz/baz.component'
                               import * from '../bar/bar.component'`,
          'foo.component.html': '',
          'foo.component.css': '',
          'foo.component.spec.ts': '',
          'foo.ts': '',
          'index.ts': `export * from './foo.component'`
        },
        'bar': {
          'baz': {
            'baz.component.ts': 'import * from "../bar.component"',
            'baz.html': '<h1> Hello </h1>'
          },
          'bar.component.ts': `import * from './baz/baz.component'
                               import * from '../foo'`,
          'bar.component.spec.ts': ''
        },
        'foo-baz': {
          'no-module.component.ts': '',
          'no-module.component.spec.ts': 'import * from "../bar/bar.component";'
        },
        'quux': {
          'quux.ts': '',
          'quux.html': '',
          'quux.css': '',
          'quux.spec.ts': ''
        },
        'noAngular.tag.ts': '',
        'noAngular.tag.html': '',
        'noAngular.tag.sass': '',
        'noAngular.tag.spec.ts': '',
      }
    };
    mockFs(mockDrive);
  });
  afterEach(() => {
    mockFs.restore();
  });

  describe('getImportClauses', () => {
    it('returns import specifiers when there is a single import statement', (done) => {
      let sourceFile = path.join(rootPath, 'bar/baz/baz.component.ts');
      return dependentFilesUtils.createTsSourceFile(sourceFile)
        .then((tsFile: ts.SourceFile) => {
          let contents = dependentFilesUtils.getImportClauses(tsFile);
          let expectedContents = [{
            specifierText: '../bar.component',
            pos: 13,
            end: 32
          }];
          expect(contents).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
    it('returns imports specifiers when there are multiple import statements', (done) => {
      let sourceFile = path.join(rootPath, 'foo/foo.component.ts');
      return dependentFilesUtils.createTsSourceFile(sourceFile)
        .then((tsFile: ts.SourceFile) => {
          let contents = dependentFilesUtils.getImportClauses(tsFile);
          let expectedContents = [
            {
              specifierText: '../bar/baz/baz.component',
              pos: 13,
              end: 40
            },
            {
              specifierText: '../bar/bar.component',
              pos: 85,
              end: 108
            }
          ];
          expect(contents).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
  });

  describe('createTsSourceFile', () => {
    it('creates ts.SourceFile give a file path', (done) => {
      let sourceFile = path.join(rootPath, 'foo/foo.component.ts');
      return dependentFilesUtils.createTsSourceFile(sourceFile)
        .then((tsFile: ts.SourceFile) => {
          let isTsSourceFile = (tsFile.kind === ts.SyntaxKind.SourceFile);
          expect(isTsSourceFile).toBe(true);
        })
        .then(done, done.fail);
    });
  });

  describe('hasIndexFile', () => {
    it('returns true when there is a index file', (done) => {
      let sourceFile = path.join(rootPath, 'foo');
      dependentFilesUtils.hasIndexFile(sourceFile)
        .then((booleanValue: boolean) => {
          expect(booleanValue).toBe(true);
        })
        .then(done, done.fail);
    });
    it('returns false when there is no index file', (done) => {
      let sourceFile = path.join(rootPath, 'bar');
      dependentFilesUtils.hasIndexFile(sourceFile)
        .then((booleanValue: boolean) => {
          expect(booleanValue).toBe(false);
        })
        .then(done, done.fail);
    });
  });

  describe('returns an array of all the associated files of a given component unit.', () => {
    it('when the component name has a special Angular tag(component/pipe/service)', (done) => {
      let sourceFile = path.join(rootPath, 'foo/foo.component.ts');
      return dependentFilesUtils.getAllAssociatedFiles(sourceFile)
        .then((files: string[]) => {
          let expectedContents = [
            'src/app/foo/foo.component.css',
            'src/app/foo/foo.component.html',
            'src/app/foo/foo.component.spec.ts',
            'src/app/foo/foo.component.ts'
          ];
          expect(files).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
    it('when the component name has non-Angular tag', (done) => {
      let sourceFile = path.join(rootPath, 'noAngular.tag.ts');
      return dependentFilesUtils.getAllAssociatedFiles(sourceFile)
        .then((files: string[]) => {
          let expectedContents = [
            'src/app/noAngular.tag.html',
            'src/app/noAngular.tag.sass',
            'src/app/noAngular.tag.spec.ts',
            'src/app/noAngular.tag.ts'
            ];
          expect(files).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
    it('when the component name has no tag after the unique file name', (done) => {
      let sourceFile = path.join(rootPath, 'quux/quux.ts');
      return dependentFilesUtils.getAllAssociatedFiles(sourceFile)
        .then((files: string[]) => {
          let expectedContents = [
            'src/app/quux/quux.css',
            'src/app/quux/quux.html',
            'src/app/quux/quux.spec.ts',
            'src/app/quux/quux.ts'
            ];
          expect(files).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
  });

  describe('returns a map of all files which depend on a given file ', () => {
    it('when the given component unit has no index file', (done) => {
      let sourceFile = path.join(rootPath, 'bar/bar.component.ts');
      return dependentFilesUtils.getDependentFiles(sourceFile, rootPath)
        .then((contents: dependentFilesUtils.ModuleMap) => {
          let bazFile = path.join(rootPath, 'bar/baz/baz.component.ts');
          let fooFile = path.join(rootPath, 'foo/foo.component.ts');
          let noModuleSpecFile = path.join(rootPath, 'foo-baz/no-module.component.spec.ts');
          let expectedContents: dependentFilesUtils.ModuleMap = {};
          expectedContents[bazFile] = [{
              specifierText: '../bar.component',
              pos: 13,
              end: 32
          }];
          expectedContents[fooFile] = [{
            specifierText: '../bar/bar.component',
            pos: 85,
            end: 108
          }];
          expectedContents[noModuleSpecFile] = [{
            specifierText: '../bar/bar.component',
            pos: 13,
            end: 36
          }];
          expect(contents).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
    it('when the given component unit has no index file [More Test]', (done) => {
      let sourceFile = path.join(rootPath, 'bar/baz/baz.component.ts');
      return dependentFilesUtils.getDependentFiles(sourceFile, rootPath)
        .then((contents: dependentFilesUtils.ModuleMap) => {
          let expectedContents: dependentFilesUtils.ModuleMap = {};
          let barFile = path.join(rootPath, 'bar/bar.component.ts');
          let fooFile = path.join(rootPath, 'foo/foo.component.ts');
          expectedContents[barFile] = [{
            specifierText: './baz/baz.component',
            pos: 13,
            end: 35
          }];
          expectedContents[fooFile] = [{
            specifierText: '../bar/baz/baz.component',
            pos: 13,
            end: 40
          }];
          expect(contents).toEqual(expectedContents);
        })
        .then(done, done.fail);
    });
    it('when there are no dependent files', (done) => {
      let sourceFile = path.join(rootPath, 'foo-baz/no-module.component.ts');
      return dependentFilesUtils.getDependentFiles(sourceFile, rootPath)
        .then((contents: dependentFilesUtils.ModuleMap) => {
          expect(contents).toEqual({});
        })
        .then(done, done.fail);
    });
 });
});
