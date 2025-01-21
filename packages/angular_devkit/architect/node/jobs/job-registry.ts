/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { jobs } from '../../src';
import { JsonValue, schema } from '@angular-devkit/core';
import { Observable, of } from 'rxjs';

export class NodeModuleJobRegistry<
  MinimumArgumentValueT extends JsonValue = JsonValue,
  MinimumInputValueT extends JsonValue = JsonValue,
  MinimumOutputValueT extends JsonValue = JsonValue,
> implements jobs.Registry<MinimumArgumentValueT, MinimumInputValueT, MinimumOutputValueT>
{
  protected _resolve(name: string): string | null {
    try {
      return require.resolve(name);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
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
  get<A extends MinimumArgumentValueT, I extends MinimumInputValueT, O extends MinimumOutputValueT>(
    name: jobs.JobName,
  ): Observable<jobs.JobHandler<A, I, O> | null> {
    const [moduleName, exportName] = name.split(/#/, 2);

    const resolvedPath = this._resolve(moduleName);
    if (!resolvedPath) {
      return of(null);
    }

    const pkg = require(resolvedPath);
    const handler = pkg[exportName || 'default'];
    if (!handler) {
      return of(null);
    }

    function _getValue(...fields: unknown[]) {
      return fields.find((x) => schema.isJsonSchema(x)) || true;
    }

    const argument = _getValue(pkg.argument, handler.argument);
    const input = _getValue(pkg.input, handler.input);
    const output = _getValue(pkg.output, handler.output);
    const channels = _getValue(pkg.channels, handler.channels);

    return of(
      Object.assign(handler.bind(undefined), {
        jobDescription: {
          argument,
          input,
          output,
          channels,
        },
      }),
    );
  }
}
