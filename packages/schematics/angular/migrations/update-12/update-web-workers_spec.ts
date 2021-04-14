/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to update Web Workers for Webpack 5', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  const workerConsumerPath = 'src/consumer.ts';
  const workerConsumerContent = `
    import { enableProdMode } from '@angular/core';
    import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
    import { AppModule } from './app/app.module';
    import { environment } from './environments/environment';
    if (environment.production) { enableProdMode(); }
    platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.error(err));

    const worker = new Worker('./app/app.worker', { type: 'module' });
    worker.onmessage = ({ data }) => {
      console.log('page got message:', data);
    };
    worker.postMessage('hello');
  `;

  beforeEach(async () => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create('/package.json', JSON.stringify({}));
  });

  it('should replace the string path argument with a URL constructor', async () => {
    tree.create(workerConsumerPath, workerConsumerContent);

    await schematicRunner.runSchematicAsync('update-web-workers-webpack-5', {}, tree).toPromise();
    await schematicRunner.engine.executePostTasks().toPromise();

    const consumer = tree.readContent(workerConsumerPath);

    expect(consumer).not.toContain(`new Worker('./app/app.worker'`);
    expect(consumer).toContain(
      `new Worker(new URL('./app/app.worker', import.meta.url), { type: 'module' });`,
    );
  });

  it('should not replace the first argument if arguments types are invalid', async () => {
    tree.create(workerConsumerPath, workerConsumerContent.replace(`'./app/app.worker'`, '42'));

    await schematicRunner.runSchematicAsync('update-web-workers-webpack-5', {}, tree).toPromise();
    await schematicRunner.engine.executePostTasks().toPromise();

    const consumer = tree.readContent(workerConsumerPath);

    expect(consumer).toContain(`new Worker(42`);
    expect(consumer).not.toContain(
      `new Worker(new URL('42', import.meta.url), { type: 'module' });`,
    );
  });

  it('should not replace the first argument if type value is not "module"', async () => {
    tree.create(workerConsumerPath, workerConsumerContent.replace(`type: 'module'`, `type: 'xyz'`));

    await schematicRunner.runSchematicAsync('update-web-workers-webpack-5', {}, tree).toPromise();
    await schematicRunner.engine.executePostTasks().toPromise();

    const consumer = tree.readContent(workerConsumerPath);

    expect(consumer).toContain(`new Worker('./app/app.worker'`);
    expect(consumer).not.toContain(
      `new Worker(new URL('42', import.meta.url), { type: 'xyz' });`,
    );
  });

  it('should replace the module path string when file has BOM', async () => {
    tree.create(workerConsumerPath, '\uFEFF' + workerConsumerContent);

    await schematicRunner.runSchematicAsync('update-web-workers-webpack-5', {}, tree).toPromise();
    await schematicRunner.engine.executePostTasks().toPromise();

    const consumer = tree.readContent(workerConsumerPath);

    expect(consumer).not.toContain(`new Worker('./app/app.worker'`);
    expect(consumer).toContain(
      `new Worker(new URL('./app/app.worker', import.meta.url), { type: 'module' });`,
    );
  });
});
