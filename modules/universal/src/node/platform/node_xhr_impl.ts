import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

import {NgZone} from 'angular2/core';
import {XHR} from 'angular2/compiler';
import {PromiseWrapper, PromiseCompleter} from 'angular2/src/facade/promise';

export class NodeXHRImpl extends XHR {
  constructor(public ngZone: NgZone) {
    super();
  }

  get(templateUrl: string): Promise<string> {
    const completer: PromiseCompleter<string> = PromiseWrapper.completer();
    const parsedUrl = url.parse(templateUrl);

    if (parsedUrl.protocol === 'file:') {
      this.ngZone.run(() => {
        fs.readFile(parsedUrl.path, (err, data) => {
          if (err) {
            return completer.reject(`Failed to load ${templateUrl} with error ${err}`);
          }
          this.ngZone.run(() => {
            completer.resolve(data.toString());
          });
        });
      });
    } else {
      this.ngZone.run(() => {
        http.get(parsedUrl, (res) => {
          res.setEncoding('utf8');

          const status = res.statusCode;

          if (200 <= status && status <= 300) {
            let data = '';

            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              this.ngZone.run(() => {
                completer.resolve(data);
              });
            });

          } else {
            this.ngZone.run(() => {
              completer.reject(`Failed to load ${templateUrl}`, null);
            });
          }

          // consume response body
          res.resume();
        }).on('error', (e) => {
          this.ngZone.run(() => {
            completer.reject(`Failed to load ${templateUrl}`, null);
          });
        });
      });
    }

    return completer.promise;
  }
}
