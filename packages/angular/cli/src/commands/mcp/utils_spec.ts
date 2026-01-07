/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { CommandError } from './host';
import { createStructuredContentOutput, getCommandErrorLogs } from './utils';

describe('MCP Utils', () => {
  describe('createStructuredContentOutput', () => {
    it('should create valid structured content output', () => {
      const data = { foo: 'bar' };
      const output = createStructuredContentOutput(data);

      expect(output.structuredContent).toEqual(data);
      expect(output.content).toEqual([{ type: 'text', text: JSON.stringify(data, null, 2) }]);
    });
  });

  describe('getCommandErrorLogs', () => {
    it('should extract logs from CommandError', () => {
      const logs = ['log1', 'log2'];
      const err = new CommandError('failed', logs, 1);
      expect(getCommandErrorLogs(err)).toEqual([...logs, 'failed']);
    });

    it('should extract message from Error', () => {
      const err = new Error('oops');
      expect(getCommandErrorLogs(err)).toEqual(['oops']);
    });

    it('should stringify unknown error', () => {
      expect(getCommandErrorLogs('weird error')).toEqual(['weird error']);
    });
  });
});
