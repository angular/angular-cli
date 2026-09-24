/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ServerContext } from '@modelcontextprotocol/server';
import { join } from 'node:path';
import { MockHost } from '../../testing/mock-host';
import { registerZonelessMigrationTool } from './zoneless-migration';

function createComponent(name: string, metadata = ''): string {
  return `
    import { ChangeDetectionStrategy, Component } from '@angular/core';

    @Component({
      selector: 'app-${name}',
      template: '',${metadata}
    })
    export class ${name}Component {}
  `;
}

describe('registerZonelessMigrationTool', () => {
  const dir = join('/', 'project', 'src');
  let host: MockHost;
  let extras: ServerContext;
  let send: jasmine.Spy;

  function setFiles(files: Record<string, string>): void {
    host.stat.and.resolveTo({ isDirectory: () => true });
    host.existsSync.and.returnValue(false);
    host.glob.and.callFake(() =>
      (async function* () {
        for (const name of Object.keys(files)) {
          yield { parentPath: dir, name };
        }
      })(),
    );
    const contents = new Map(Object.entries(files).map(([name, text]) => [join(dir, name), text]));
    host.readFile.and.callFake(async (path: string) => {
      const text = contents.get(path);
      if (text === undefined) {
        throw new Error(`Unexpected read: ${path}`);
      }

      return text;
    });
  }

  beforeEach(() => {
    host = new MockHost();
    send = jasmine.createSpy('send').and.rejectWith(new Error('sampling not supported'));
    extras = {
      mcpReq: {
        log: jasmine.createSpy(),
        notify: jasmine.createSpy(),
        send,
      },
    } as unknown as ServerContext;
  });

  it('should skip components that already set a change detection strategy', async () => {
    setFiles({
      'a.component.ts': createComponent(
        'A',
        '\n      changeDetection: ChangeDetectionStrategy.OnPush,',
      ),
      'b.component.ts': createComponent(
        'B',
        '\n      changeDetection: ChangeDetectionStrategy.Default,',
      ),
    });

    await registerZonelessMigrationTool(dir, host, extras);

    expect(send).not.toHaveBeenCalled();
  });

  it('should rank components that do not set a change detection strategy', async () => {
    setFiles({
      'a.component.ts': createComponent('A'),
      'b.component.ts': createComponent('B'),
    });

    await registerZonelessMigrationTool(dir, host, extras);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('should still report NgZone usages in components that already set a strategy', async () => {
    setFiles({
      'a.component.ts': `
        import { ChangeDetectionStrategy, Component, NgZone } from '@angular/core';

        @Component({
          selector: 'app-a',
          template: '',
          changeDetection: ChangeDetectionStrategy.OnPush,
        })
        export class AComponent {
          constructor(private zone: NgZone) {
            this.zone.onMicrotaskEmpty(() => {});
          }
        }
      `,
    });

    const result = await registerZonelessMigrationTool(dir, host, extras);

    expect(result.content[0].text).toContain(
      'The component uses NgZone APIs that are incompatible with zoneless applications',
    );
  });
});
