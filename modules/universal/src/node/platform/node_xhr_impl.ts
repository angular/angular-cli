import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

import {XHR} from 'angular2/compiler';
import {PromiseWrapper, PromiseCompleter} from 'angular2/src/facade/promise';

export class NodeXHRImpl extends XHR {
  get(templateUrl: string): Promise<string> {
    const completer: PromiseCompleter<string> = PromiseWrapper.completer();
    const parsedUrl = url.parse(templateUrl);

    if (parsedUrl.protocol === 'file:') {
      fs.readFile(parsedUrl.path, (err, data) => {
        if (err) {
          return completer.reject(`Failed to load ${templateUrl} with error ${err}`);
        }
        completer.resolve(data.toString());
      });
    }
    else {
      http.get(parsedUrl, (res) => {
        res.setEncoding('utf8');

        const status = res.statusCode;

        if (200 <= status && status <= 300) {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            completer.resolve(data);
          });

        } else {
          completer.reject(`Failed to load ${templateUrl}`, null);
        }

        // consume response body
        res.resume();
      }).on('error', (e) => {
        completer.reject(`Failed to load ${templateUrl}`, null);
      });
    }

    return completer.promise;
  }
}
