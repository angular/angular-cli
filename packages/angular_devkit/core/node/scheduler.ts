/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { jobs, schema } from '../src';
import { ModuleNotFoundException, resolve } from './resolve';

export class NodeModuleJobScheduler extends jobs.SimpleScheduler {
  public constructor(
    _schemaRegistry?: schema.SchemaRegistry,
    private _resolveLocal = true,
    private _resolveGlobal = false,
  ) {
    super(_schemaRegistry);
  }

  _resolve(name: string): string | null {
    try {
      return resolve(name, {
        checkLocal: this._resolveLocal,
        checkGlobal: this._resolveGlobal,
        basedir: __dirname,
      });
    } catch (e) {
      if (e instanceof ModuleNotFoundException) {
        return null;
      }
      throw e;
    }
  }

  /**
   * Get a job description for a named job.
   *
   * @param name The name of the job.
   * @returns A description, or null if the job is not registered.
   */
  protected _createDescription(name: jobs.JobName): jobs.SimpleSchedulerJobDescription | null {
    const [moduleName, exportName] = name.split(/#/, 2);

    const resolvedPath = this._resolve(moduleName);
    if (!resolvedPath) {
      return null;
    }

    const pkg = require(resolvedPath);
    const handler = pkg[exportName || 'default'];
    if (!handler) {
      return null;
    }

    const input = ['boolean', 'object'].includes(typeof pkg.input)
      ? pkg.input : handler.input !== undefined ? handler.input : true;
    const output = ['boolean', 'object'].includes(typeof pkg.output)
      ? pkg.output : handler.output !== undefined ? handler.output : true;
    const channels = ['boolean', 'object'].includes(typeof pkg.channels)
      ? pkg.channels : handler.channels !== undefined ? handler.channels : true;

    return {
      description: {
        input,
        output,
        name,
        channels,
        inputChannel: true,
      },
      handler: pkg['default'],
    };
  }
}
