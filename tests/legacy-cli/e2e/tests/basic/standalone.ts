/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 *
 * @fileoverview
 * Tests the minimal conversion of a newly generated application
 * to use a single standalone component.
 */

import { writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';

/**
 * An application main file that uses a standalone component with
 * bootstrapApplication to start the application. `ng-template` and
 * `ngIf` are used to ensure that `CommonModule` and `imports` are
 * working in standalone mode.
 */
const STANDALONE_MAIN_CONTENT = `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { bootstrapApplication, provideProtractorTestingSupport } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <ng-template [ngIf]="isVisible">
      <div class="content">
        <span>{{name}} app is running!</span>
      </div>
    </ng-template>
  \`,
  imports: [CommonModule],
})
export class AppComponent {
  name = 'test-project';
  isVisible = true;
}

bootstrapApplication(AppComponent, {
  providers: [ provideProtractorTestingSupport() ],
});
`;

export default async function () {
  // Update to a standalone application
  await writeFile('src/main.ts', STANDALONE_MAIN_CONTENT);

  // Execute a production build
  await ng('build');

  // Perform the default E2E tests
  await ng('e2e', 'test-project');
}
