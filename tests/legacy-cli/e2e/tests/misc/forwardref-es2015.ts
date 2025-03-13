import { appendToFile, replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // Update the application to use a forward reference
  await replaceInFile(
    'src/app/app.ts',
    "import { Component } from '@angular/core';",
    "import { Component, Inject, Injectable, forwardRef } from '@angular/core';",
  );
  await appendToFile('src/app/app.ts', '\n@Injectable() export class Lock { }\n');
  await replaceInFile(
    'src/app/app.ts',
    'export class App {',
    'export class App {\n  constructor(@Inject(forwardRef(() => Lock)) lock: Lock) {}',
  );

  // Update the application's unit tests to include the new injectable
  await replaceInFile(
    'src/app/app.spec.ts',
    "import { App } from './app';",
    "import { App, Lock } from './app';",
  );
  await replaceInFile(
    'src/app/app.spec.ts',
    'TestBed.configureTestingModule({',
    'TestBed.configureTestingModule({ providers: [Lock],',
  );

  // Execute the application's tests with emitDecoratorMetadata disabled (default)
  await ng('test', '--no-watch');

  // Turn on emitDecoratorMetadata
  await replaceInFile(
    'tsconfig.json',
    '"experimentalDecorators": true',
    '"experimentalDecorators": true, "emitDecoratorMetadata": true',
  );

  // Execute the application's tests with emitDecoratorMetadata enabled
  await expectToFail(() => ng('test', '--no-watch'));
}
