import {IncomingMessage} from 'http';
import * as request from 'request';


export function request(url: string) {
  return new Promise((resolve, reject) => {
    request(url, (error: any, response: IncomingMessage, _: any) => {
      if (error) {
        reject(error);
      } else if (response.statusCode >= 400) {
        reject(new Error(`Requesting "${url}" returned status code ${response.statusCode}.`);
      } else {
        resolve(response);
      }
    });
  });
}
