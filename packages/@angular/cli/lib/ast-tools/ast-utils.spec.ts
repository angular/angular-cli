import denodeify = require('denodeify');
import mockFs = require('mock-fs');
import ts = require('typescript');
import fs = require('fs');

import {InsertChange, NodeHost, RemoveChange} from './change';
import {insertAfterLastOccurrence, addDeclarationToModule} from './ast-utils';
import {findNodes} from './node';
import {it} from './spec-utils';

const readFile = <any>denodeify(fs.readFile);


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
      .apply(NodeHost)
      .then(() => {
        let rootNode = getRootNode(sourceFile);
        let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
        expect(nodes).toEqual([]);
      });
  });
  it('finds one import', () => {
    let rootNode = getRootNode(sourceFile);
    let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
    expect(nodes.length).toEqual(1);
  });
  it('finds two imports from inline declarations', () => {
    // remove new line and add an inline import
    let editedFile = new RemoveChange(sourceFile, 32, '\n');
    return editedFile
      .apply(NodeHost)
      .then(() => {
        let insert = new InsertChange(sourceFile, 32, `import {Routes} from '@angular/routes'`);
        return insert.apply(NodeHost);
      })
      .then(() => {
        let rootNode = getRootNode(sourceFile);
        let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
        expect(nodes.length).toEqual(2);
      });
  });
  it('finds two imports from new line separated declarations', () => {
    let editedFile = new InsertChange(sourceFile, 33, `import {Routes} from '@angular/routes'`);
    return editedFile
      .apply(NodeHost)
      .then(() => {
        let rootNode = getRootNode(sourceFile);
        let nodes = findNodes(rootNode, ts.SyntaxKind.ImportDeclaration);
        expect(nodes.length).toEqual(2);
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
      .apply(NodeHost)
      .then(() => {
        return readFile(sourceFile, 'utf8');
      }).then((content) => {
        let expected = '\nimport { Router } from \'@angular/router\';';
        expect(content).toEqual(expected);
      });
  });
  it('throws an error if first occurence with no fallback position', () => {
    let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
    expect(() => insertAfterLastOccurrence(imports, `import { Router } from '@angular/router';`,
                                           sourceFile)).toThrowError();
  });
  it('inserts after last import', () => {
    let content = `import { foo, bar } from 'fizz';`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
      .apply(NodeHost)
      .then(() => {
        let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
        return insertAfterLastOccurrence(imports, ', baz', sourceFile,
          0, ts.SyntaxKind.Identifier)
          .apply(NodeHost);
      })
      .then(() => {
        return readFile(sourceFile, 'utf8');
      })
      .then(newContent => expect(newContent).toEqual(`import { foo, bar, baz } from 'fizz';`));
  });
  it('inserts after last import declaration', () => {
    let content = `import * from 'foo' \n import { bar } from 'baz'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
      .apply(NodeHost)
      .then(() => {
        let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
        return insertAfterLastOccurrence(imports, `\nimport Router from '@angular/router'`,
          sourceFile)
          .apply(NodeHost);
      })
      .then(() => {
        return readFile(sourceFile, 'utf8');
      })
      .then(newContent => {
        let expected = `import * from 'foo' \n import { bar } from 'baz'` +
          `\nimport Router from '@angular/router'`;
        expect(newContent).toEqual(expected);
      });
  });
  it('inserts correctly if no imports', () => {
    let content = `import {} from 'foo'`;
    let editedFile = new InsertChange(sourceFile, 0, content);
    return editedFile
      .apply(NodeHost)
      .then(() => {
        let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
        return insertAfterLastOccurrence(imports, ', bar', sourceFile, undefined,
          ts.SyntaxKind.Identifier)
          .apply(NodeHost);
      })
      .catch(() => {
        return readFile(sourceFile, 'utf8');
      })
      .then(newContent => {
        expect(newContent).toEqual(content);
        // use a fallback position for safety
        let imports = getNodesOfKind(ts.SyntaxKind.ImportDeclaration, sourceFile);
        let pos = findNodes(imports.sort((a, b) => a.pos - b.pos).pop(),
          ts.SyntaxKind.CloseBraceToken).pop().pos;
        return insertAfterLastOccurrence(imports, ' bar ',
          sourceFile, pos, ts.SyntaxKind.Identifier)
          .apply(NodeHost);
      })
      .then(() => {
        return readFile(sourceFile, 'utf8');
      })
      .then(newContent => {
        expect(newContent).toEqual(`import { bar } from 'foo'`);
      });
  });
});


describe('addDeclarationToModule', () => {
  beforeEach(() => {
    mockFs({
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
    return addDeclarationToModule('1.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply(NodeHost))
      .then(() => readFile('1.ts', 'utf-8'))
      .then(content => {
        expect(content).toEqual(
          '\n' +
          'import {NgModule} from \'@angular/core\';\n' +
          'import { MyClass } from \'MyImportPath\';\n' +
          '\n' +
          '@NgModule({\n' +
          '  declarations: [MyClass]\n' +
          '})\n' +
          'class Module {}'
        );
      });
  });

  it('works with array with declarations', () => {
    return addDeclarationToModule('2.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply(NodeHost))
      .then(() => readFile('2.ts', 'utf-8'))
      .then(content => {
        expect(content).toEqual(
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
      });
  });

  it('works without any declarations', () => {
    return addDeclarationToModule('3.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply(NodeHost))
      .then(() => readFile('3.ts', 'utf-8'))
      .then(content => {
        expect(content).toEqual(
          '\n' +
          'import {NgModule} from \'@angular/core\';\n' +
          'import { MyClass } from \'MyImportPath\';\n' +
          '\n' +
          '@NgModule({\n' +
          '  declarations: [MyClass]\n' +
          '})\n' +
          'class Module {}'
        );
      });
  });

  it('works without a declaration field', () => {
    return addDeclarationToModule('4.ts', 'MyClass', 'MyImportPath')
      .then(change => change.apply(NodeHost))
      .then(() => readFile('4.ts', 'utf-8'))
      .then(content => {
        expect(content).toEqual(
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
      });
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
    ts.ScriptTarget.Latest, true);
}
