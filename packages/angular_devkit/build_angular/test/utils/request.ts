/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as http from 'http';
import * as https from 'https';
import * as Url from 'url';

export function request(url: string, headers = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = Url.parse(url);
    const options: http.RequestOptions = {
      hostname: u.hostname,
      protocol: u.protocol,
      host: u.host,
      port: u.port,
      path: u.path,
      headers: { 'Accept': 'text/html', ...headers },
    };

    function _callback(res: http.IncomingMessage) {
      if (!res.statusCode || res.statusCode >= 400) {
        // Consume the rest of the data to free memory.
        res.resume();
        reject(new Error(`Requesting "${url}" returned status code ${res.statusCode}.`));
      } else {
        res.setEncoding('utf8');
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(data);
          } catch (err) {
            reject(err);
          }
        });
      }
    }

    if (u.protocol == 'https:') {
      options.agent = new https.Agent({ rejectUnauthorized: false });
      https.get(options, _callback);
    } else if (u.protocol == 'http:') {
      http.get(options, _callback);
    } else {
      throw new Error(`Unknown protocol: ${JSON.stringify(u.protocol)}.`);
    }
  });
}
