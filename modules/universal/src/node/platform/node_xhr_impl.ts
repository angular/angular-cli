import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';

import {ORIGIN_URL, BASE_URL} from '../../common';
import {NgZone, Inject, Optional} from '@angular/core';
import {XHR} from '@angular/compiler';

export class NodeXHRImpl extends XHR {
  _baseUrl: string;
  constructor(
    public ngZone: NgZone,
    @Optional() @Inject(ORIGIN_URL) private _originUrl: string = '',
    @Optional() @Inject(BASE_URL) _baseUrl?: string) {
    super();
    this._baseUrl = _baseUrl || '/';
  }

  get(templateUrl: string): Promise<string> {
    const parsedUrl = url.parse(url.resolve(url.resolve(this._originUrl, this._baseUrl), templateUrl));
    return new Promise((resolve, reject) => {
      if (parsedUrl.protocol === 'file:') {
        // TODO(jeffbcross): is this promise already zone-aware/patched?
        this.ngZone.run(() => {
          fs.readFile(parsedUrl.path, (err, data) => {
            if (err) {
              return reject(`Failed to load ${templateUrl} with error ${err}`);
            }
            this.ngZone.run(() => {
              resolve(data.toString());
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
                  resolve(data);
                });
              });

            } else {
              this.ngZone.run(() => {
                reject(`Failed to load ${templateUrl}`);
              });
            }

            // consume response body
            res.resume();
          }).on('error', (e) => {
            this.ngZone.run(() => {
              reject(`Failed to load ${templateUrl}`);
            });
          });
        });
      }
    });
  }
}
