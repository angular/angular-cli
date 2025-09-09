/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Node, SourceFile } from 'typescript';
import { loadTypescript } from './ts_utils';
import { MigrationResponse } from './types';

/* eslint-disable max-len */

export function createProvideZonelessForTestsSetupPrompt(testFilePath: string): MigrationResponse {
  const text = `You are an expert Angular developer assisting with a migration to zoneless. Your task is to update the test file at \`${testFilePath}\` to enable zoneless change detection and identify tests that are not yet compatible.

    Follow these instructions precisely.

    ### Refactoring Guide

    The test file \`${testFilePath}\` is not yet configured for zoneless change detection. You need to enable it for the entire test suite and then identify which specific tests fail.

    #### Step 1: Enable Zoneless Change Detection for the Suite

    In the main \`beforeEach\` block for the test suite (the one inside the top-level \`describe\`), add \`provideZonelessChangeDetection()\` to the providers array in \`TestBed.configureTestingModule\`.

    *   If there is already an import from \`@angular/core\`, add \`provideZonelessChangeDetection\` to the existing import.
    *   Otherwise, add a new import statement for \`provideZonelessChangeDetection\` from \`@angular/core\`.

    \`\`\`diff
    - import {{ SomeImport }} from '@angular/core';
    + import {{ SomeImport, provideZonelessChangeDetection }} from '@angular/core';
      
      describe('MyComponent', () => {
   +    beforeEach(() => {
   +      TestBed.configureTestingModule({providers: [provideZonelessChangeDetection()]});
   +    });
      });
    \`\`\`

    #### Step 2: Identify and fix Failing Tests

    After enabling zoneless detection for the suite, some tests will likely fail. Your next task is to identify these failing tests and fix them.

    ${testDebuggingGuideText(testFilePath)}
    8.  **DO** add \`provideZonelessChangeDetection()\` _once_ to the top-most \`describe\` in a \`beforeEach\` block as instructed in Step 1.
    9.  **DO** run the tests after adding \`provideZonelessChangeDetection\` to see which ones fail. **DO NOT** make assumptions about which tests will might fail.

    ### Final Step
    After you have applied all the required changes and followed all the rules, consult this tool again for the next steps in the migration process.`;

  return createResponse(text);
}

export function createUnsupportedZoneUsagesMessage(
  usages: string[],
  filePath: string,
): MigrationResponse {
  const text = `You are an expert Angular developer assisting with a migration to zoneless. Your task is to refactor the component in ${filePath} to remove unsupported NgZone APIs.

The component uses NgZone APIs that are incompatible with zoneless applications. The only permitted NgZone APIs are \`NgZone.run\` and \`NgZone.runOutsideAngular\`.

The following usages are unsupported and must be fixed:
${usages.map((usage) => `- ${usage}`).join('\n')}

Follow these instructions precisely to refactor the code.

### Refactoring Guide

#### 1. APIs to Remove (No Replacement)
The following methods have no replacement in a zoneless context and must be removed entirely:
- \`NgZone.assertInAngularZone\`
- \`NgZone.assertNotInAngularZone\`
- \`NgZone.isInAngularZone\`

#### 2. APIs to Replace
The \`onMicrotaskEmpty\` and \`onStable\` observables must be replaced with modern Angular APIs.

- **For single-event subscriptions** (e.g., using \`.pipe(take(1))\` or \`.pipe(first())\`), use \`afterNextRender\` from \`@angular/core\`.

  \`\`\`diff
  - this.zone.onMicrotaskEmpty.pipe(take(1)).subscribe(() => {});
  - this.zone.onStable.pipe(take(1)).subscribe(() => {});
  + import { afterNextRender, Injector } from '@angular/core';
  + afterNextRender(() => {}, {injector: this.injector});
  \`\`\`

- **For continuous subscriptions**, use \`afterEveryRender\` from \`@angular/core\`.

  \`\`\`diff
  - this.zone.onMicrotaskEmpty.subscribe(() => {});
  - this.zone.onStable.subscribe(() => {});
  + import { afterEveryRender, Injector } from '@angular/core';
  + afterEveryRender(() => {}, {injector: this.injector});
  \`\`\`

- If the code checks \`this.zone.isStable\` before subscribing, you can remove the \`isStable\` check. \`afterNextRender\` handles this case correctly.

### IMPORTANT: Rules and Constraints
You must follow these rules without exception:
1.  **DO NOT** make any changes to the component that are unrelated to removing the unsupported NgZone APIs listed above.
2.  **DO NOT** remove or modify usages of \`NgZone.run\` or \`NgZone.runOutsideAngular\`. These are still required.
3.  **DO** ensure that you replace \`onMicrotaskEmpty\` and \`onStable\` with the correct replacements (\`afterNextRender\` or \`afterEveryRender\`) as described in the guide.
4.  **DO** add the necessary imports for \`afterNextRender\`, \`afterEveryRender\`, and \`Injector\` when you use them.

### Final Step
After you have applied all the required changes and followed all the rules, consult this tool again for the next steps in the migration process.
`;

  return createResponse(text);
}

export function generateZonelessMigrationInstructionsForComponent(
  filePath: string,
): MigrationResponse {
  const text = `You are an expert Angular developer assisting with a migration to zoneless. Your task is to refactor the component in \`${filePath}\` to be compatible with zoneless change detection by ensuring Angular is notified of all state changes that affect the view.

  The component does not currently use a change detection strategy, which means it may rely on Zone.js. To prepare it for zoneless, you must manually trigger change detection when its state changes.

  Follow these instructions precisely.

  ### Refactoring Guide

  #### Step 1: Identify and Refactor State
  Your primary goal is to ensure that every time a component property used in the template is updated, Angular knows it needs to run change detection.

  1.  **Identify Properties**: Find all component properties that are read by the template.
  2.  **Choose a Strategy**: For each property identified, choose one of the following refactoring strategies:
    *   **(Preferred) Convert to Signal**: The best approach is to convert the property to an Angular Signal. This is the most idiomatic and future-proof way to handle state in zoneless applications.
    *   **(Alternative) Use \`markForCheck()\`**: If converting to a signal is too complex or would require extensive refactoring, you can instead inject \`ChangeDetectorRef\` and call \`this.cdr.markForCheck()\` immediately after the property is updated.

  #### Step 2: Add \`ChangeDetectionStrategy.Default\`
  After you have refactored all necessary properties, you must update the component's decorator to explicitly set the change detection strategy.

  1.  Add \`ChangeDetectionStrategy\` to the import from \`@angular/core\`.
  2.  In the \`@Component\` decorator, add the property \`changeDetection: ChangeDetectionStrategy.Default\`.
  3.  Add a \`// TODO\` comment above this line explaining that the component should be fully migrated to \`OnPush\` after the application has been tested with these changes.

  Example:
  \`\`\`typescript
  @Component({
    ...
    // TODO: This component has been partially migrated to be zoneless-compatible.
    // After testing, this should be updated to ChangeDetectionStrategy.OnPush.
    changeDetection: ChangeDetectionStrategy.Default,
  })
  \`\`\`

  ### IMPORTANT: Rules and Constraints
  You must follow these rules without exception:
  1.  **DO** apply one of the two refactoring strategies (signals or \`markForCheck()\`) for all relevant component properties.
  2.  **DO** add \`changeDetection: ChangeDetectionStrategy.Default\` with the specified TODO comment as the final code change.
  3.  **DO NOT** use \`ChangeDetectionStrategy.OnPush\`. This will be the next step in the migration, but it is not part of this task.
  4.  **DO NOT** modify properties that are already signals or are used with the \`async\` pipe in the template, as they are already zoneless-compatible.
  5.  **DO NOT** make any changes to files other than the component file at \`${filePath}\` and its direct template/style files if necessary.

  ### Final Step
  After you have applied all the required changes and followed all the rules, consult this tool again for the next steps in the migration process.`;

  return createResponse(text);
}

export function createTestDebuggingGuideForNonActionableInput(
  fileOrDirPath: string,
): MigrationResponse {
  const text = `You are an expert Angular developer assisting with a migration to zoneless.

No actionable migration steps were found in the application code for \`${fileOrDirPath}\`. However, if the tests for this code are failing with zoneless enabled, the tests themselves likely need to be updated.

Your task is to investigate and fix any failing tests related to the code in \`${fileOrDirPath}\`.

${testDebuggingGuideText(fileOrDirPath)}
`;

  return createResponse(text);
}

export async function createFixResponseForZoneTests(
  sourceFile: SourceFile,
): Promise<MigrationResponse | null> {
  const ts = await loadTypescript();
  const usages: Node[] = [];
  ts.forEachChild(sourceFile, function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(sourceFile) === 'provideZoneChangeDetection'
    ) {
      usages.push(node);
    }
    ts.forEachChild(node, visit);
  });
  if (usages.length === 0) {
    // No usages of provideZoneChangeDetection found, so no fix needed.
    return null;
  }

  const locations = usages.map((node) => {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return `line ${line + 1}, character ${character + 1}`;
  });
  const text = `You are an expert Angular developer assisting with a migration to zoneless. Your task is to update the test file at \`${sourceFile.fileName}\` to be fully zoneless-compatible.

      The test suite has been partially migrated, but some tests were incompatible and are still using Zone.js-based change detection via \`provideZoneChangeDetection\`. You must refactor these tests to work in a zoneless environment and remove the \`provideZoneChangeDetection\` calls.

      The following usages of \`provideZoneChangeDetection\` must be removed:
      ${locations.map((loc) => `- ${loc}`).join('\n')}

      After removing \`provideZoneChangeDetection\`, the tests will likely fail. Use this guide to diagnose and fix the failures.

      ${testDebuggingGuideText(sourceFile.fileName)}

      ### Final Step
      After you have applied all the required changes and followed all the rules, consult this tool again for the next steps in the migration process.`;

  return createResponse(text);
}

function testDebuggingGuideText(fileName: string) {
  return `
      ### Test Debugging Guide

      1.  **\`ExpressionChangedAfterItHasBeenCheckedError\`**:
        *   **Cause**: This error indicates that a value in a component's template was updated, but Angular was not notified to run change detection.
        *   **Solution**:
          *   If the value is in a test-only wrapper component, update the property to be a signal.
          *   For application components, either convert the property to a signal or call \`ChangeDetectorRef.markForCheck()\` immediately after the property is updated.

      2.  **Asynchronous Operations and Timing**:
        *   **Cause**: Without Zone.js, change detection is always scheduled asynchronously. Tests that previously relied on synchronous updates might now fail. The \`fixture.whenStable()\` utility also no longer waits for timers (like \`setTimeout\` or \`setInterval\`).
        *   **Solution**:
          *   Avoid relying on synchronous change detection.
          *   To wait for asynchronous operations to complete, you may need to poll for an expected state, use \`fakeAsync\` with \`tick()\`, or use a mock clock to flush timers.

      3.  **Indirect Dependencies**:
        *   **Cause**: The component itself might be zoneless-compatible, but it could be using a service or another dependency that is not.
        *   **Solution**: Investigate the services and dependencies used by the component and its tests. Run this tool on those dependencies to identify and fix any issues.

      ### IMPORTANT: Rules and Constraints

      You must follow these rules without exception:
      1.  **DO** focus only on fixing the tests for the code in \`${fileName}\`.
      2.  **DO** remove all usages of \`provideZoneChangeDetection\` from the test file.
      3.  **DO** apply the solutions described in the debugging guide to fix any resulting test failures.
      4.  **DO** update properties of test components and directives to use signals. Tests often use plain objects and values and update the component state directly before calling \`fixture.detectChanges\`. This will not work and will result in \`ExpressionChangedAfterItHasBeenCheckedError\` because Angular was not notifed of the change.
      5.  **DO NOT** make changes to application code unless it is to fix a bug revealed by the zoneless migration (e.g., converting a property to a signal to fix an \`ExpressionChangedAfterItHasBeenCheckedError\`).
      6.  **DO NOT** make any changes unrelated to fixing the failing tests in \`${fileName}\`.
      7.  **DO NOT** re-introduce \`provideZoneChangeDetection()\` into tests that are already using \`provideZonelessChangeDetection()\`.`;
}

/* eslint-enable max-len */

export function createResponse(text: string): MigrationResponse {
  return {
    content: [{ type: 'text', text }],
  };
}
