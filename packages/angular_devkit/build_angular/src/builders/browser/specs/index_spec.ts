/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, tags, virtualFs, workspaces } from '@angular-devkit/core';
import { lastValueFrom } from 'rxjs';
import { createArchitect, host } from '../../../testing/test-utils';
import { BrowserBuilderOutput } from '../index';

describe('Browser Builder index HTML processing', () => {
  const targetSpec = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works with UTF-8 BOM', async () => {
    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf8',
      ),
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content).toBe(
      `<html><head><base href="/"><link rel="stylesheet" href="styles.css"></head>` +
        `<body><app-root></app-root><script src="runtime.js" type="module"></script>` +
        `<script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script><script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });

  // todo: enable when utf16 is supported
  xit('works with UTF16 LE BOM', async () => {
    host.writeMultipleFiles({
      'src/index.html': Buffer.from(
        '\ufeff<html><head><base href="/"></head><body><app-root></app-root></body></html>',
        'utf16le',
      ),
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content).toBe(
      `<html><head><base href="/"><link rel="stylesheet" href="styles.css"></head>` +
        `<body><app-root></app-root>` +
        `<script src="runtime.js" type="module"></script><script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script>` +
        `<script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });

  it('keeps escaped charaters', async () => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><title>&iacute;</title><base href="/"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content).toBe(
      `<html><head><title>&iacute;</title><base href="/"><link rel="stylesheet" href="styles.css"></head> ` +
        `<body><app-root></app-root><script src="runtime.js" type="module"></script>` +
        `<script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script><script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });

  it('keeps custom template charaters', async () => {
    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><base href="/"><%= csrf_meta_tags %></head>
        <body><app-root></app-root></body></html>
      `,
    });

    const run = await architect.scheduleTarget(targetSpec);
    const output = (await run.result) as BrowserBuilderOutput;
    expect(output.success).toBe(true);
    const fileName = join(normalize(output.outputs[0].path), 'index.html');
    const content = virtualFs.fileBufferToString(
      await lastValueFrom(host.read(normalize(fileName))),
    );
    expect(content).toBe(
      `<html><head><base href="/"><%= csrf_meta_tags %><link rel="stylesheet" href="styles.css"></head> ` +
        `<body><app-root></app-root><script src="runtime.js" type="module"></script>` +
        `<script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script><script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });

  it('uses the input value from the index option longform', async () => {
    const { workspace } = await workspaces.readWorkspace(
      host.root(),
      workspaces.createWorkspaceHost(host),
    );
    const app = workspace.projects.get('app');
    if (!app) {
      fail('Test application "app" not found.');

      return;
    }
    const target = app.targets.get('build');
    if (!target) {
      fail('Test application "app" target "build" not found.');

      return;
    }
    if (!target.options) {
      target.options = {};
    }
    target.options.index = { input: 'src/index-2.html' };
    await workspaces.writeWorkspace(workspace, workspaces.createWorkspaceHost(host));

    host.writeMultipleFiles({
      'src/index-2.html': tags.oneLine`
        <html><head><base href="/"><%= csrf_meta_tags %></head>
        <body><app-root></app-root></body></html>
      `,
    });
    await host.delete(join(host.root(), normalize('src/index.html'))).toPromise();

    // Recreate architect to use update angular.json
    architect = (await createArchitect(host.root())).architect;

    const run = await architect.scheduleTarget(targetSpec);
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    const outputIndexPath = join(host.root(), 'dist', 'index.html');
    const content = await lastValueFrom(host.read(normalize(outputIndexPath)));
    expect(virtualFs.fileBufferToString(content)).toBe(
      `<html><head><base href="/"><%= csrf_meta_tags %><link rel="stylesheet" href="styles.css"></head> ` +
        `<body><app-root></app-root><script src="runtime.js" type="module"></script>` +
        `<script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script><script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });

  it('uses the output value from the index option longform', async () => {
    const { workspace } = await workspaces.readWorkspace(
      host.root(),
      workspaces.createWorkspaceHost(host),
    );
    const app = workspace.projects.get('app');
    if (!app) {
      fail('Test application "app" not found.');

      return;
    }
    const target = app.targets.get('build');
    if (!target) {
      fail('Test application "app" target "build" not found.');

      return;
    }
    if (!target.options) {
      target.options = {};
    }
    target.options.index = { input: 'src/index.html', output: 'main.html' };
    await workspaces.writeWorkspace(workspace, workspaces.createWorkspaceHost(host));

    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><base href="/"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    // Recreate architect to use update angular.json
    architect = (await createArchitect(host.root())).architect;

    const run = await architect.scheduleTarget(targetSpec);
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    const outputIndexPath = join(host.root(), 'dist', 'main.html');
    const content = await lastValueFrom(host.read(normalize(outputIndexPath)));
    expect(virtualFs.fileBufferToString(content)).toBe(
      `<html><head><base href="/"><link rel="stylesheet" href="styles.css"></head> ` +
        `<body><app-root></app-root><script src="runtime.js" type="module"></script>` +
        `<script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script><script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });

  it('creates subdirectories for output value from the index option longform', async () => {
    const { workspace } = await workspaces.readWorkspace(
      host.root(),
      workspaces.createWorkspaceHost(host),
    );
    const app = workspace.projects.get('app');
    if (!app) {
      fail('Test application "app" not found.');

      return;
    }
    const target = app.targets.get('build');
    if (!target) {
      fail('Test application "app" target "build" not found.');

      return;
    }
    if (!target.options) {
      target.options = {};
    }
    target.options.index = { input: 'src/index.html', output: 'extra/main.html' };
    await workspaces.writeWorkspace(workspace, workspaces.createWorkspaceHost(host));

    host.writeMultipleFiles({
      'src/index.html': tags.oneLine`
        <html><head><base href="/"></head>
        <body><app-root></app-root></body></html>
      `,
    });

    // Recreate architect to use update angular.json
    architect = (await createArchitect(host.root())).architect;

    const run = await architect.scheduleTarget(targetSpec);
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    const outputIndexPath = join(host.root(), 'dist', 'extra', 'main.html');
    const content = await lastValueFrom(host.read(normalize(outputIndexPath)));
    expect(virtualFs.fileBufferToString(content)).toBe(
      `<html><head><base href="/"><link rel="stylesheet" href="styles.css"></head> ` +
        `<body><app-root></app-root><script src="runtime.js" type="module"></script>` +
        `<script src="polyfills.js" type="module"></script>` +
        `<script src="vendor.js" type="module"></script><script src="main.js" type="module"></script></body></html>`,
    );
    await run.stop();
  });
});
