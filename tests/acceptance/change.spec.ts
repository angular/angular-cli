'use strict';

// This needs to be first so fs module can be mocked correctly.
let mockFs = require('mock-fs');

import {expect} from 'chai';
import {InsertChange, RemoveChange, ReplaceChange} from '../../addon/ng2/utilities/change';
import fs = require('fs');

let path = require('path');
let Promise = require('ember-cli/lib/ext/promise');

const readFile =  Promise.denodeify(fs.readFile);

describe('Change', () => {
  let sourcePath = 'src/app/my-component';

  beforeEach(() => {
    let mockDrive = {
      'src/app/my-component': {
        'add-file.txt': 'hello',
        'remove-replace-file.txt': 'import * as foo from "./bar"',
        'replace-file.txt': 'import { FooComponent } from "./baz"'
      }
    };
    mockFs(mockDrive);
  });
  afterEach(() => {
    mockFs.restore();
  });

  describe('InsertChange', () => {
    let sourceFile = path.join(sourcePath, 'add-file.txt');

    it('adds text to the source code', () => {
      let changeInstance = new InsertChange(sourceFile, 6, ' world!');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('hello world!');
        });
    });
    it('fails for negative position', () => {
      expect(() => new InsertChange(sourceFile, -6, ' world!')).to.throw(Error);
    });
    it('adds nothing in the source code if empty string is inserted', () => {
      let changeInstance = new InsertChange(sourceFile, 6, '');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('hello');
        });
    });
  });

  describe('RemoveChange', () => {
    let sourceFile = path.join(sourcePath, 'remove-replace-file.txt');

    it('removes given text from the source code', () => {
      let changeInstance = new RemoveChange(sourceFile, 9, 'as foo');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('import *  from "./bar"');
        });
    });
    it('fails for negative position', () => {
      expect(() => new RemoveChange(sourceFile, -6, ' world!')).to.throw(Error);
    });
    it('does not change the file if told to remove empty string', () => {
      let changeInstance = new RemoveChange(sourceFile, 9, '');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('import * as foo from "./bar"');
        });
    });
  });

  describe('ReplaceChange', () => {
    it('replaces the given text in the source code', () => {
      let sourceFile = path.join(sourcePath, 'remove-replace-file.txt');
      let changeInstance = new ReplaceChange(sourceFile, 7, '* as foo', '{ fooComponent }');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('import { fooComponent } from "./bar"');
        });
    });
    it('fails for negative position', () => {
      let sourceFile = path.join(sourcePath, 'remove-replace-file.txt');
      expect(() => new ReplaceChange(sourceFile, -6, 'hello', ' world!')).to.throw(Error);
    });
    it('adds string to the position of an empty string', () => {
      let sourceFile = path.join(sourcePath, 'replace-file.txt');
      let changeInstance = new ReplaceChange(sourceFile, 9, '', 'BarComponent, ');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('import { BarComponent, FooComponent } from "./baz"');
        });
    });
    it('removes the given string only if an empty string to add is given', () => {
      let sourceFile = path.join(sourcePath, 'remove-replace-file.txt');
      let changeInstance = new ReplaceChange(sourceFile, 9, ' as foo', '');
      return changeInstance
        .apply()
        .then(() => readFile(sourceFile, 'utf8'))
        .then(contents => {
          expect(contents).to.equal('import * from "./bar"');
        });
    });
  });
});
