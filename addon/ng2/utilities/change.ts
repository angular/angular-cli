'use strict';

import * as Promise from 'ember-cli/lib/ext/promise';
import fs = require('fs');

const readFile = Promise.denodeify(fs.readFile);
const writeFile = Promise.denodeify(fs.writeFile);

export interface Change {

  apply(): Promise<void>;

  // The file this change should be applied to. Some changes might not apply to
  // a file (maybe the config).
  path: string | null;

  // The order this change should be applied. Normally the position inside the file.
  // Changes are applied from the bottom of a file to the top.
  order: number;

  // The description of this change. This will be outputted in a dry or verbose run.
  description: string;
}

/**
 * Will add text to the source code.
 */
export class InsertChange implements Change {

  const order: number;
  const description: string;

  constructor(
      public path: string,
      private pos: number,
      private toAdd: string,
      ) {
    if (pos < 0) {
      throw new Error('Negative positions are invalid');
    }
    this.description = `Inserted ${toAdd} into position ${pos} of ${path}`;
    this.order = pos;
  }

  /**
   * This method does not insert spaces if there is none in the original string.
   */
  apply(): Promise<any> {
    return readFile(this.path, 'utf8').then(content => {
      let prefix = content.substring(0, this.pos);
      let suffix = content.substring(this.pos);
      return writeFile(this.path, `${prefix}${this.toAdd}${suffix}`);
    });
  }
}

/**
 * Will remove text from the source code.
 */
export class RemoveChange implements Change {

  const order: number;
  const description: string;

  constructor(
      public path: string,
      private pos: number,
      private toRemove: string) {
    if (pos < 0) {
      throw new Error('Negative positions are invalid');
    }
    this.description = `Removed ${toRemove} into position ${pos} of ${path}`;
    this.order = pos;
  }

  apply(): Promise<any> {
    return readFile(this.path, 'utf8').then(content => {
      let prefix = content.substring(0, this.pos);
      let suffix = content.substring(this.pos + this.toRemove.length);
      // TODO: throw error if toRemove doesn't match removed string.
      return writeFile(this.path, `${prefix}${suffix}`);
    });
  }
}

/**
 * Will replace text from the source code.
 */
export class ReplaceChange implements Change {

  const order: number;
  const description: string;

  constructor(
      public path: string,
      private pos: number,
      private oldText: string,
      private newText: string) {
    if (pos < 0) {
      throw new Error('Negative positions are invalid');
    }
    this.description = `Replaced ${oldText} into position ${pos} of ${path} with ${newText}`;
    this.order = pos;
  }

  apply(): Promise<any> {
    return readFile(this.path, 'utf8').then(content => {
      let prefix = content.substring(0, this.pos);
      let suffix = content.substring(this.pos + this.oldText.length);
      // TODO: throw error if oldText doesn't match removed string.
      return writeFile(this.path, `${prefix}${this.newText}${suffix}`);
    });
  }
}
