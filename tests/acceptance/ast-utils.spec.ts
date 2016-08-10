import * as mockFs from 'mock-fs';
import { expect } from 'chai';
import * as ts from 'typescript';
import * as fs from 'fs';
import { InsertChange, RemoveChange } from '../../addon/ng2/utilities/change';
import * as Promise from 'ember-cli/lib/ext/promise';
import {
  findNodes,
  insertAfterLastOccurrence,
  addComponentToModule
} from '../../addon/ng2/utilities/ast-utils';

const readFile = Promise.denodeify(fs.readFile);

describe('ast-utils: findNodes', () => {
  const sourceFile = 'tmp/tmp.ts';

  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'tmp.ts': `import * as myTest from 'tests' \n` +
                  'hello.'
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('finds no imports', () => {
    let editedFile = new RemoveChange(sourceFile, 0, `import * as myTest from 'tests' \n`);
    return editedFile
    .apply()
    .then(() => {
      let rootNode = getRootNode(sourceFile);
      let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
      expect(nodes).to.be.empty;
    });
  });
  it('finds one import', () => {
    let rootNode = getRootNode(sourceFile);
    let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
    expect(nodes.length).to.equal(1);
  });
  it('finds two imports from inline declarations', () => {
    // remove new line and add an inline import
    let editedFile = new RemoveChange(sourceFile, 32, '\n');
    return editedFile
    .apply()
    .then(() => {
      let insert = new InsertChange(sourceFile, 32, `import {Routes} from '@angular/routes'`);
      return insert.apply();
    })
    .then(() => {
      let rootNode = getRootNode(sourceFile);
      let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
      expect(nodes.length).to.equal(2);
    });
  });
  it('finds two imports from new line separated declarations', () => {
    let editedFile = new InsertChange(sourceFile, 33, `import {Routes} from '@angular/routes'`);
    return editedFile
    .apply()
    .then(() => {
      let rootNode = getRootNode(sourceFile);
      let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
      expect(nodes.length).to.equal(2);
    });
  });
});

describe('ast-utils: insertAfterLastOccurrence', () => {
  const sourceFile = 'tmp/tmp.ts';
  beforeEach(() => {
    let mockDrive = {
      'tmp': {
        'tmp.ts': ''
      }
    };
    mockFs(mockDrive);
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('inserts at beginning of file', () => {
    let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
    return insertAfterLastOccurrence(imports, `\nimport { Router } from '@angular/router';`,
                                    sourceFile, 0)
    .apply()
    .then(() => {
      return readFile(sourceFile, 'utf8');
    }).then((content) => {
      let expected = '\nimport { Router } from \'@angular/router\';';
      expect(content).to.equal(expected);
    });
  });
  it('throws an error if first occurence with no fallback position', () => {
    let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
    expect(() => insertAfterLastOccurrence(imports, `import { Router } from '@angular/router';`,
                                    sourceFile)).to.throw(Error);
  });
  it('inserts after last import', () => {
    let content = `import { foo, bar } from 'fizz';`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      return insertAfterLastOccurrence(imports, ', baz', sourceFile,
                                      0, ts.SyntaxKind.Identifier)
             .apply();
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => expect(newContent).to.equal(`import { foo, bar, baz } from 'fizz';`));
  });
  it('inserts after last import declaration', () => {
    let content = `import * from 'foo' \n import { bar } from 'baz'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
    .then(() => {
      let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      return insertAfterLastOccurrence(imports, `\nimport Router from '@angular/router'`,
                                      sourceFile)
             .apply();
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      let expected = `import * from 'foo' \n import { bar } from 'baz'` +
                     `\nimport Router from '@angular/router'`;
      expect(newContent).to.equal(expected);
    });
  });
  it('inserts correctly if no imports', () => {
    let content = `import {} from 'foo'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
    .apply()
   .then(() => {
     let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
     return insertAfterLastOccurrence(imports, ', bar', sourceFile, undefined,
                                     ts.SyntaxKind.Identifier)
            .apply();
   }).catch(() => {
     return readFile(sourceFile, 'utf8');
   })
    .then(newContent => {
      expect(newContent).to.equal(content);
      // use a fallback position for safety
      let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
      let pos = findNodes(imports.sort((a, b) => a.pos - b.pos).pop(),
                          ts.SyntaxKind.CloseBraceToken).pop().pos;
      return insertAfterLastOccurrence(imports, ' bar ',
                                      sourceFile, pos, ts.SyntaxKind.Identifier)
             .apply();
    }).then(() => {
      return readFile(sourceFile, 'utf8');
    }).then(newContent => {
      expect(newContent).to.equal(`import { bar } from 'foo'`);
    });
  });
});


describe('addComponentToModule', () => {
  beforeEach(() => {
    mockFs( {
      '1.ts': `
import {NgModule} from '@angular/core';

@NgModule({
  declarations: []
})
class Module {}`,
      '2.ts': `
import {NgModule} from '@angular/core';

@NgModule({
  declarations: [
    Other
  ]
})
class Module {}`,
      '3.ts': `
import {NgModule} from '@angular/core';

@NgModule({
})
class Module {}`,
      '4.ts': `
import {NgModule} from '@angular/core';

@NgModule({
  field1: [],
  field2: {}
})
class Module {}`
    });
  });
  afterEach(() => mockFs.restore());

  it('works with empty array', () => {
    return addComponentToModule('1.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply())
      .then(() => readFile('1.ts', 'utf-8'))
      .then(content => {
        expect(content).to.equal(
          '\n' +
          'import {NgModule} from \'@angular/core\';\n' +
          'import { MyClass } from \'MyImportPath\';\n' +
          '\n' +
          '@NgModule({\n' +
          '  declarations: [MyClass]\n' +
          '})\n' +
          'class Module {}'
        );
      })
  });

  it('works with array with declarations', () => {
    return addComponentToModule('2.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply())
      .then(() => readFile('2.ts', 'utf-8'))
      .then(content => {
        expect(content).to.equal(
          '\n' +
          'import {NgModule} from \'@angular/core\';\n' +
          'import { MyClass } from \'MyImportPath\';\n' +
          '\n' +
          '@NgModule({\n' +
          '  declarations: [\n' +
          '    Other,\n' +
          '    MyClass\n' +
          '  ]\n' +
          '})\n' +
          'class Module {}'
        );
      })
  });

  it('works without any declarations', () => {
    return addComponentToModule('3.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply())
      .then(() => readFile('3.ts', 'utf-8'))
      .then(content => {
        expect(content).to.equal(
          '\n' +
          'import {NgModule} from \'@angular/core\';\n' +
          'import { MyClass } from \'MyImportPath\';\n' +
          '\n' +
          '@NgModule({\n' +
          '  declarations: [MyClass]\n' +
          '})\n' +
          'class Module {}'
        );
      })
  });

  it('works without a declaration field', () => {
    return addComponentToModule('4.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply())
      .then(() => readFile('4.ts', 'utf-8'))
      .then(content => {
        expect(content).to.equal(
          '\n' +
          'import {NgModule} from \'@angular/core\';\n' +
          'import { MyClass } from \'MyImportPath\';\n' +
          '\n' +
          '@NgModule({\n' +
          '  field1: [],\n' +
          '  field2: {},\n' +
          '  declarations: [MyClass]\n' +
          '})\n' +
          'class Module {}'
        );
      })
  });
});

  /**
 * Gets node of kind kind from sourceFile
 */
function getNodesOfKind(kind: ts.SyntaxKind, sourceFile: string) {
  return findNodes(getRootNode(sourceFile), kind);
}

function getRootNode(sourceFile: string) {
  return ts.createSourceFile(sourceFile, fs.readFileSync(sourceFile).toString(),
                                         ts.ScriptTarget.ES6, true);
}
