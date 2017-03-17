import {IncomingMessage} from 'http';
import * as _request from 'request';


export function request(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let options = {
      url: url,
      headers: { 'Accept': 'text/html' },
      agentOptions: { rejectUnauthorized: false }
    };
    _request(options, (error: any, response: IncomingMessage, body: string) => {
      if (error) {
        reject(error);
      } else if (response.statusCode >= 400) {
        reject(new Error(`Requesting "${url}" returned status code ${response.statusCode}.`));
      } else {
        resolve(body);
      }
    });
  });
}
