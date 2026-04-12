/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deleteOutputDir } from './delete-output-dir';

describe('deleteOutputDir', () => {
    let workspaceRoot: string;

    beforeEach(async () => {
        workspaceRoot = await mkdtemp(join(tmpdir(), 'angular-cli-test-'));
        await mkdir(join(workspaceRoot, 'dist'), { recursive: true });
        await writeFile(join(workspaceRoot, 'dist', 'file.txt'), 'test');
    });

    afterEach(async () => {
        await rm(workspaceRoot, { recursive: true, force: true });
    });

    it('should reject deleting the project root directory', async () => {
        await expectAsync(deleteOutputDir(workspaceRoot, '.')).toBeRejectedWithError(
            'Output path MUST not be project root directory!',
        );
    });

    it('should reject deleting a path outside the project root', async () => {
        await expectAsync(deleteOutputDir(workspaceRoot, '..')).toBeRejectedWithError(
            new RegExp(`Output path '.*' MUST be inside the project root '${workspaceRoot}'.`),
        );
    });
});