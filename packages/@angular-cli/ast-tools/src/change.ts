import fs = require('fs');
import denodeify = require('denodeify');

const readFile = (denodeify(fs.readFile) as (...args: any[]) => Promise<string>);
const writeFile = (denodeify(fs.writeFile) as (...args: any[]) => Promise<string>);

export interface Change {
  apply(): Promise<void>;

  // The file this change should be applied to. Some changes might not apply to
  // a file (maybe the config).
  readonly path: string | null;

  // The order this change should be applied. Normally the position inside the file.
  // Changes are applied from the bottom of a file to the top.
  readonly order: number;

  // The description of this change. This will be outputted in a dry or verbose run.
  readonly description: string;
}


/**
 * An operation that does nothing.
 */
export class NoopChange implements Change {
  description = 'No operation.';
  order = Infinity;
  path: string = null;
  apply() { return Promise.resolve(); }
}

/**
 * An operation that mixes two or more changes, and merge them (in order).
 * Can only apply to a single file. Use a ChangeManager to apply changes to multiple
 * files.
 */
export class MultiChange implements Change {
  private _path: string;
  private _changes: Change[];

  constructor(...changes: (Change[] | Change)[]) {
    this._changes = [];
    [].concat(...changes).forEach(change => this.appendChange(change));
  }

  appendChange(change: Change) {
    // Validate that the path is the same for everyone of those.
    if (this._path === undefined) {
      this._path = change.path;
    } else if (change.path !== this._path) {
      throw new Error('Cannot apply a change to a different path.');
    }
    this._changes.push(change);
  }

  get description() {
    return `Changes:\n   ${this._changes.map(x => x.description).join('\n   ')}`;
  }
  // Always apply as early as the highest change.
  get order() { return Math.max(...this._changes.map(c => c.order)); }
  get path() { return this._path; }

  apply() {
    return this._changes
      .sort((a: Change, b: Change) => b.order - a.order)
      .reduce((promise, change) => {
        return promise.then(() => change.apply());
      }, Promise.resolve());
  }
}


/**
 * Will add text to the source code.
 */
export class InsertChange implements Change {

  order: number;
  description: string;

  constructor(public path: string, private pos: number, private toAdd: string) {
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

  order: number;
  description: string;

  constructor(public path: string, private pos: number, private toRemove: string) {
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
  order: number;
  description: string;

  constructor(public path: string, private pos: number, private oldText: string,
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
