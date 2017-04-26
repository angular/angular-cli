import * as fs from 'fs';
import { ResourceLoader } from '@angular/compiler';

export class FileLoader implements ResourceLoader {
  get(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // install node types
      fs.readFile(url, (err: NodeJS.ErrnoException, buffer: Buffer) => {
        if (err) {
          return reject(err);
        }

        resolve(buffer.toString());
      });
    });
  }
}
