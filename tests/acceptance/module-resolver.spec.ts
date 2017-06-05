import mockFs = require('mock-fs');
import * as ts from 'typescript';
import * as path from 'path';
import * as dependentFilesUtils from '@angular/cli/utilities/get-dependent-files';
import { ModuleResolver } from '@angular/cli/utilities/module-resolver';

describe('ModuleResolver', () => {
  let rootPath = 'src/app';

  beforeEach(() => {
    let mockDrive = {
      'src/app': {
        'foo': {
          'foo.component.ts': `import * from "../bar/baz/baz.component";`,
        },
        'bar': {
          'baz': {
            'baz.component.ts': `import * from "../bar.component"
                                 import * from '../../foo-baz/qux/quux/foobar/foobar.component'
                                 `,
            'baz.component.spec.ts': 'import * from "./baz.component";'
          },
          'bar.component.ts': `import * from './baz/baz.component'
                               import * from '../foo/foo.component'`,
        },
        'foo-baz': {
          'qux': {
            'quux': {
              'foobar': {
                'foobar.component.ts': `import * from "../../../../foo/foo.component"
                                        import * from '../fooqux.component'
                                        `,
              },
              'fooqux': {
                'fooqux.component.ts': 'import * from                 "../foobar/foobar.component"'
              }
            }
          },
          'no-module.component.ts': '',
          'foo-baz.component.ts': 'import * from \n"../foo/foo.component"\n'
        },
        'empty-dir': {}
      }
    };
    mockFs(mockDrive);
  });
  afterEach(() => {
    mockFs.restore();
  });

  describe('Rewrite imports', () => {
    // Normalize paths for platform specific delimeter.
    let barFile = path.join(rootPath, 'bar/bar.component.ts');
    let fooFile = path.join(rootPath, 'foo/foo.component.ts');
    let bazFile = path.join(rootPath, 'bar/baz/baz.component.ts');
    let fooBazFile = path.join(rootPath, 'foo-baz/foo-baz.component.ts');
    let fooBarFile = path.join(rootPath, 'foo-baz/qux/quux/foobar/foobar.component.ts');
    let fooQuxFile = path.join(rootPath, 'foo-baz/qux/quux/fooqux/fooqux.component.ts');

    it('when there is no index.ts in oldPath', (done) => {
      let oldFilePath = path.join(rootPath, 'bar/baz/baz.component.ts');
      let newFilePath = path.join(rootPath, 'foo');
      let resolver = new ModuleResolver(oldFilePath, newFilePath, rootPath);
      return resolver.resolveDependentFiles()
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(barFile))
        .then((tsFileBar: ts.SourceFile) => {
          let contentsBar = dependentFilesUtils.getImportClauses(tsFileBar);
          let bazExpectedContent = path.normalize('../foo/baz.component');
          expect(contentsBar[0].specifierText).toBe(bazExpectedContent);
        })
        .then(() => dependentFilesUtils.createTsSourceFile(fooFile))
        .then((tsFileFoo: ts.SourceFile) => {
          let contentsFoo = dependentFilesUtils.getImportClauses(tsFileFoo);
          let bazExpectedContent = './baz.component'.replace('/', path.sep);
          expect(contentsFoo[0].specifierText).toBe(bazExpectedContent);
        })
        .then(() => resolver.resolveOwnImports())
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(bazFile))
        .then((tsFileBaz: ts.SourceFile) => {
          let contentsBaz = dependentFilesUtils.getImportClauses(tsFileBaz);
          let barExpectedContent = path.normalize('../bar/bar.component');
          let fooBarExpectedContent = path.normalize('../foo-baz/qux/quux/foobar/foobar.component');
          expect(contentsBaz[0].specifierText).toBe(barExpectedContent);
          expect(contentsBaz[1].specifierText).toBe(fooBarExpectedContent);
        })
        .then(done, done.fail);
    });
    it('when no files are importing the given file', (done) => {
      let oldFilePath = path.join(rootPath, 'foo-baz/foo-baz.component.ts');
      let newFilePath = path.join(rootPath, 'bar');
      let resolver = new ModuleResolver(oldFilePath, newFilePath, rootPath);
      return resolver.resolveDependentFiles()
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => resolver.resolveOwnImports())
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(fooBazFile))
        .then((tsFile: ts.SourceFile) => {
          let contents = dependentFilesUtils.getImportClauses(tsFile);
          let fooExpectedContent = path.normalize('../foo/foo.component');
          expect(contents[0].specifierText).toBe(fooExpectedContent);
        })
        .then(done, done.fail);
    });
    it('when oldPath and newPath both do not have index.ts', (done) => {
      let oldFilePath = path.join(rootPath, 'bar/baz/baz.component.ts');
      let newFilePath = path.join(rootPath, 'foo-baz');
      let resolver = new ModuleResolver(oldFilePath, newFilePath, rootPath);
      return resolver.resolveDependentFiles()
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(barFile))
        .then((tsFileBar: ts.SourceFile) => {
          let contentsBar = dependentFilesUtils.getImportClauses(tsFileBar);
          let bazExpectedContent = path.normalize('../foo-baz/baz.component');
          expect(contentsBar[0].specifierText).toBe(bazExpectedContent);
        })
        .then(() => dependentFilesUtils.createTsSourceFile(fooFile))
        .then((tsFileFoo: ts.SourceFile) => {
          let contentsFoo = dependentFilesUtils.getImportClauses(tsFileFoo);
          let bazExpectedContent = path.normalize('../foo-baz/baz.component');
          expect(contentsFoo[0].specifierText).toBe(bazExpectedContent);
        })
        .then(() => resolver.resolveOwnImports())
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(bazFile))
        .then((tsFile: ts.SourceFile) => {
          let contentsBaz = dependentFilesUtils.getImportClauses(tsFile);
          let barExpectedContent = path.normalize('../bar/bar.component');
          let fooBarExpectedContent =
            `.${path.sep}qux${path.sep}quux${path.sep}foobar${path.sep}foobar.component`;
          expect(contentsBaz[0].specifierText).toBe(barExpectedContent);
          expect(contentsBaz[1].specifierText).toBe(fooBarExpectedContent);
        })
        .then(done, done.fail);
    });
    it('when there are multiple spaces between symbols and specifier', (done) => {
      let oldFilePath = path.join(rootPath, 'foo-baz/qux/quux/foobar/foobar.component.ts');
      let newFilePath = path.join(rootPath, 'foo');
      let resolver = new ModuleResolver(oldFilePath, newFilePath, rootPath);
      return resolver.resolveDependentFiles()
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(fooQuxFile))
        .then((tsFileFooQux: ts.SourceFile) => {
          let contentsFooQux = dependentFilesUtils.getImportClauses(tsFileFooQux);
          let fooQuxExpectedContent = path.normalize('../../../../foo/foobar.component');
          expect(contentsFooQux[0].specifierText).toBe(fooQuxExpectedContent);
        })
        .then(() => dependentFilesUtils.createTsSourceFile(bazFile))
        .then((tsFileBaz: ts.SourceFile) => {
          let contentsBaz = dependentFilesUtils.getImportClauses(tsFileBaz);
          let bazExpectedContent = path.normalize('../../foo/foobar.component');
          expect(contentsBaz[1].specifierText).toBe(bazExpectedContent);
        })
        .then(() => resolver.resolveOwnImports())
        .then((changes) => resolver.applySortedChangePromise(changes))
        .then(() => dependentFilesUtils.createTsSourceFile(fooBarFile))
        .then((tsFileFooBar: ts.SourceFile) => {
          let contentsFooBar = dependentFilesUtils.getImportClauses(tsFileFooBar);
          let fooExpectedContent = `.${path.sep}foo.component`;
          let fooQuxExpectedContent = path.normalize('../foo-baz/qux/quux/fooqux.component');
          expect(contentsFooBar[0].specifierText).toBe(fooExpectedContent);
          expect(contentsFooBar[1].specifierText).toBe(fooQuxExpectedContent);
        })
        .then(done, done.fail);
    });
  });
});
