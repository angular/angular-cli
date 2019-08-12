/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ProgressBar from 'progress';
import * as readline from 'readline';

export class MultiProgressBar<Key, T> {
  private _bars = new Map<Key, { data: T, bar: ProgressBar }>();

  constructor(private _status: string, private _stream = process.stderr) {}
  private _add(id: Key, data: T): { data: T, bar: ProgressBar } {
    const width = Math.min(80, this._stream.columns || 80);
    const value = {
      data,
      bar: new ProgressBar(this._status, {
        renderThrottle: 0,
        clear: true,
        total: 1,
        width: width,
        complete: '#',
        incomplete: '.',
        stream: this._stream,
      }),
    };
    this._bars.set(id, value);
    readline.moveCursor(this._stream, 0, 1);

    return value;
  }

  complete(id: Key) {
    const maybeBar = this._bars.get(id);
    if (maybeBar) {
      maybeBar.bar.complete = true;
    }
  }

  add(id: Key, data: T) {
    this._add(id, data);
  }

  get(key: Key): T | undefined {
    const maybeValue = this._bars.get(key);

    return maybeValue && maybeValue.data;
  }
  has(key: Key) {
    return this._bars.has(key);
  }
  update(key: Key, data: T, current?: number, total?: number) {
    let maybeBar = this._bars.get(key);

    if (!maybeBar) {
      maybeBar = this._add(key, data);
    }

    maybeBar.data = data;
    if (total !== undefined) {
      maybeBar.bar.total = total;
    }
    if (current !== undefined) {
      maybeBar.bar.curr = Math.max(0, Math.min(current, maybeBar.bar.total));
    }
  }

  render(max = Infinity, sort?: (a: T, b: T) => number) {
    const stream = this._stream;

    readline.moveCursor(stream, 0, -this._bars.size);
    readline.cursorTo(stream, 0);

    let values: Iterable<{ data: T, bar: ProgressBar }> = this._bars.values();
    if (sort) {
      values = [...values].sort((a, b) => sort(a.data, b.data));
    }

    for (const { data, bar } of values) {
      if (max-- == 0) {
        return;
      }

      bar.render(data);
      readline.moveCursor(stream, 0, 1);
      readline.cursorTo(stream, 0);
    }
  }

  terminate() {
    for (const { bar } of this._bars.values()) {
      bar.terminate();
    }
    this._bars.clear();
  }
}
