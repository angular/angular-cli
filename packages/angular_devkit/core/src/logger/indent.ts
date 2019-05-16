/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { map } from 'rxjs/operators';
import { Logger } from './logger';


/**
 * Keep an map of indentation => array of indentations based on the level.
 * This is to optimize calculating the prefix based on the indentation itself. Since most logs
 * come from similar levels, and with similar indentation strings, this will be shared by all
 * loggers. Also, string concatenation is expensive so performing concats for every log entries
 * is expensive; this alleviates it.
 */
const indentationMap: {[indentationType: string]: string[]} = {};


export class IndentLogger extends Logger {
  constructor(name: string, parent: Logger | null = null, indentation = '  ') {
    super(name, parent);

    indentationMap[indentation] = indentationMap[indentation] || [''];
    const indentMap = indentationMap[indentation];

    this._observable = this._observable.pipe(map(entry => {
      const l = entry.path.filter(x => !!x).length;
      if (l >= indentMap.length) {
        let current = indentMap[indentMap.length - 1];
        while (l >= indentMap.length) {
          current += indentation;
          indentMap.push(current);
        }
      }

      entry.message = indentMap[l] + entry.message.split(/\n/).join('\n' + indentMap[l]);

      return entry;
    }));
  }
}
