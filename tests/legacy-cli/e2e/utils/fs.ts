import { PathLike, promises as fs, constants } from 'fs';
import { dirname, join } from 'path';
import { stripIndents } from 'common-tags';

export function readFile(fileName: string): Promise<string> {
  return fs.readFile(fileName, 'utf-8');
}

export function writeFile(fileName: string, content: string, options?: any): Promise<void> {
  return fs.writeFile(fileName, content, options);
}

export function deleteFile(path: string): Promise<void> {
  return fs.unlink(path);
}

export function rimraf(path: string): Promise<void> {
  // The below should be removed and replaced with just `rm` when support for Node.Js 12 is removed.
  const { rm, rmdir } = fs as typeof fs & {
    rm?: (
      path: PathLike,
      options?: {
        force?: boolean;
        maxRetries?: number;
        recursive?: boolean;
        retryDelay?: number;
      },
    ) => Promise<void>;
  };

  if (rm) {
    return rm(path, {
      force: true,
      recursive: true,
      maxRetries: 3,
    });
  } else {
    return rmdir(path, {
      recursive: true,
      maxRetries: 3,
    });
  }
}

export function moveFile(from: string, to: string): Promise<void> {
  return fs.rename(from, to);
}

export function symlinkFile(from: string, to: string, type?: string): Promise<void> {
  return fs.symlink(from, to, type);
}

export function createDir(path: string): Promise<void> {
  return fs.mkdir(path, { recursive: true });
}

export async function copyFile(from: string, to: string): Promise<void> {
  await createDir(dirname(to));

  return fs.copyFile(from, to, constants.COPYFILE_FICLONE);
}

export async function moveDirectory(from: string, to: string): Promise<void> {
  await rimraf(to);
  await createDir(to);

  for (const entry of await fs.readdir(from)) {
    const fromEntry = join(from, entry);
    const toEntry = join(to, entry);
    if ((await fs.stat(fromEntry)).isFile()) {
      await copyFile(fromEntry, toEntry);
    } else {
      await moveDirectory(fromEntry, toEntry);
    }
  }
}

export function writeMultipleFiles(fs: { [path: string]: string }) {
  return Promise.all(Object.keys(fs).map((fileName) => writeFile(fileName, fs[fileName])));
}

export function replaceInFile(filePath: string, match: RegExp | string, replacement: string) {
  return readFile(filePath).then((content: string) =>
    writeFile(filePath, content.replace(match, replacement)),
  );
}

export function appendToFile(filePath: string, text: string, options?: any) {
  return readFile(filePath).then((content: string) =>
    writeFile(filePath, content.concat(text), options),
  );
}

export function prependToFile(filePath: string, text: string, options?: any) {
  return readFile(filePath).then((content: string) =>
    writeFile(filePath, text.concat(content), options),
  );
}

export async function expectFileMatchToExist(dir: string, regex: RegExp): Promise<string> {
  const files = await fs.readdir(dir);
  const fileName = files.find((name) => regex.test(name));

  if (!fileName) {
    throw new Error(`File ${regex} was expected to exist but not found...`);
  }

  return fileName;
}

export async function expectFileNotToExist(fileName: string): Promise<void> {
  try {
    await fs.access(fileName, constants.F_OK);
  } catch {
    return;
  }

  throw new Error(`File ${fileName} was expected not to exist but found...`);
}

export async function expectFileToExist(fileName: string): Promise<void> {
  try {
    await fs.access(fileName, constants.F_OK);
  } catch {
    throw new Error(`File ${fileName} was expected to exist but not found...`);
  }
}

export function expectFileToMatch(fileName: string, regEx: RegExp | string) {
  return readFile(fileName).then((content) => {
    if (typeof regEx == 'string') {
      if (content.indexOf(regEx) == -1) {
        throw new Error(stripIndents`File "${fileName}" did not contain "${regEx}"...
            Content:
            ${content}
            ------
          `);
      }
    } else {
      if (!content.match(regEx)) {
        throw new Error(stripIndents`File "${fileName}" did not contain "${regEx}"...
            Content:
            ${content}
            ------
          `);
      }
    }
  });
}

export async function getFileSize(fileName: string) {
  const stats = await fs.stat(fileName);

  return stats.size;
}

export async function expectFileSizeToBeUnder(fileName: string, sizeInBytes: number) {
  const fileSize = await getFileSize(fileName);

  if (fileSize > sizeInBytes) {
    throw new Error(
      `File "${fileName}" exceeded file size of "${sizeInBytes}". Size is ${fileSize}.`,
    );
  }
}
