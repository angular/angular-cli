/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { PriorityQueue } from './priority-queue';


describe('PriorityQueue', () => {
  it('adds an item', () => {
    const queue = new PriorityQueue<number>((x, y) => x - y);

    queue.push(99);

    expect(queue.size).toBe(1);
    expect(queue.peek()).toBe(99);
  });
});
