import { appendToFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { expectToFail } from '../../utils/utils';

export default async function() {
  // Ensure an ES2015 build is used in test
  await writeFile('browserslist', 'Chrome 65');

  // Update the application to use a forward reference
  await replaceInFile(
    'src/app/app.component.ts',
    'import { Component } from \'@angular/core\';',
    'import { Component, Inject, Injectable, forwardRef } from \'@angular/core\';',
  );
  await appendToFile('src/app/app.component.ts', '\n@Injectable() export class Lock { }\n');
  await replaceInFile(
    'src/app/app.component.ts',
    'export class AppComponent {',
    'export class AppComponent {\n  constructor(@Inject(forwardRef(() => Lock)) lock: Lock) {}',
  );

  // Update the application's unit tests to include the new injectable
  await replaceInFile(
    'src/app/app.component.spec.ts',
    'import { AppComponent } from \'./app.component\';',
    'import { AppComponent, Lock } from \'./app.component\';',
  );
  await replaceInFile(
    'src/app/app.component.spec.ts',
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
