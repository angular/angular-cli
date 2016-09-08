import * as fs from 'fs';


export function readFile(fileName: string) {
  return new Promise<string>((resolve, reject) => {
    fs.readFile(fileName, 'utf-8', (err: any, data: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

export function writeFile(fileName: string, content: string) {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(fileName, content, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


export function deleteFile(path: string) {
  return new Promise<void>((resolve, reject) => {
    fs.unlink(path, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


export function moveFile(from: string, to: string) {
  return new Promise<void>((resolve, reject) => {
    fs.rename(from, to, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}


export function writeMultipleFiles(fs: any) {
  return Object.keys(fs)
    .reduce((previous, curr) => {
      return previous.then(() => writeFile(curr, fs[curr]));
    }, Promise.resolve());
}


export function replaceInFile(filePath: string, match: string, replacement: string);
export function replaceInFile(filePath: string, match: RegExp, replacement: string) {
  return readFile(filePath)
    .then((content: string) => writeFile(filePath, content.replace(match, replacement)));
}



export function expectFileToExist(fileName: string) {
  return new Promise((resolve, reject) => {
    fs.exists(fileName, (exist) => {
      if (exist) {
        resolve();
      } else {
        reject(new Error(`File ${fileName} was expected to exist but not found...`));
      }
    });
  });
}

export function expectFileToMatch(fileName: string, regEx: RegExp | string) {
  return readFile(fileName)
    .then(content => {
      if (typeof regEx == 'string') {
        if (content.indexOf(regEx) == -1) {
          throw new Error(`File "${fileName}" did not contain "${regEx}"...`);
        }
      } else {
        if (!content.match(regEx)) {
          throw new Error(`File "${fileName}" did not match regex ${regEx}...`);
        }
      }
    });
}
