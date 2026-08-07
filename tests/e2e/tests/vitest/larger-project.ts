import assert from 'node:assert';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { installPackage } from '../../utils/packages';
import { ng } from '../../utils/process';
import { applyVitestBuilder } from '../../utils/vitest';

export default async function () {
  await applyVitestBuilder();

  const artifactCount = 500;
  // A new project starts with 1 test file (app.spec.ts)
  // Each generated artifact will add one more test file.
  const initialTestCount = 1;

  await generateArtifactsInBatches(artifactCount);

  const totalTests = initialTestCount + artifactCount;
  const expectedMessage = new RegExp(`${totalTests} passed`);

  // Run tests in default (JSDOM) mode
  const { stdout: jsdomStdout } = await ng('test', '--no-watch');
  assert.match(jsdomStdout, expectedMessage, `Expected ${totalTests} tests to pass in JSDOM mode.`);

  // Setup for browser mode
  await installPackage('playwright@1');
  await installPackage('@vitest/browser-playwright@4');

  // Run tests in browser mode
  const { stdout: browserStdout } = await ng(
    'test',
    '--no-watch',
    '--browsers',
    'ChromiumHeadless',
  );
  assert.match(
    browserStdout,
    expectedMessage,
    `Expected ${totalTests} tests to pass in browser mode.`,
  );
}

async function generateArtifactsInBatches(artifactCount: number): Promise<void> {
  const files: { [path: string]: string } = {};

  for (let i = 0; i < artifactCount; i++) {
    const type = i % 3;
    const name = `test-artifact-${i}`;

    switch (type) {
      case 0:
        files[`src/app/${name}/${name}.ts`] = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-${name}',
  template: '',
})
export class TestArtifact${i}Component {}
`;
        files[`src/app/${name}/${name}.spec.ts`] = `
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestArtifact${i}Component } from './${name}';

describe('TestArtifact${i}Component', () => {
  let component: TestArtifact${i}Component;
  let fixture: ComponentFixture<TestArtifact${i}Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestArtifact${i}Component],
    }).compileComponents();

    fixture = TestBed.createComponent(TestArtifact${i}Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
`;
        break;
      case 1:
        files[`src/app/${name}.ts`] = `
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TestArtifact${i}Service {}
`;
        files[`src/app/${name}.spec.ts`] = `
import { TestBed } from '@angular/core/testing';
import { TestArtifact${i}Service } from './${name}';

describe('TestArtifact${i}Service', () => {
  let service: TestArtifact${i}Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TestArtifact${i}Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
`;
        break;
      default:
        files[`src/app/${name}-pipe.ts`] = `
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'testArtifact${i}',
})
export class TestArtifact${i}Pipe implements PipeTransform {
  transform(value: unknown): unknown {
    return null;
  }
}
`;
        files[`src/app/${name}-pipe.spec.ts`] = `
import { TestArtifact${i}Pipe } from './${name}-pipe';

describe('TestArtifact${i}Pipe', () => {
  it('create an instance', () => {
    const pipe = new TestArtifact${i}Pipe();
    expect(pipe).toBeTruthy();
  });
});
`;
        break;
    }
  }

  const entries = Object.entries(files);
  const CONCURRENCY_LIMIT = 100;
  for (let i = 0; i < entries.length; i += CONCURRENCY_LIMIT) {
    const chunk = entries.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(
      chunk.map(async ([filePath, content]) => {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, content.trim());
      }),
    );
  }
}
