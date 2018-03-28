/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { IncomingMessage } from 'http';
import * as _request from 'request';

export function request(url: string, headers = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      url: url,
      headers: { 'Accept': 'text/html', ...headers },
      agentOptions: { rejectUnauthorized: false },
    };
    // tslint:disable-next-line:no-any
    _request(options, (error: any, response: IncomingMessage, body: string) => {
      if (error) {
        reject(error);
      } else if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Requesting "${url}" returned status code ${response.statusCode}.`));
      } else {
        resolve(body);
      }
    });
  });
}
