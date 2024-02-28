/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { normalize } from 'node:path';

export class FileReferenceTracker {
  #referencingFiles = new Map<string, Set<string>>();

  get referencedFiles() {
    return this.#referencingFiles.keys();
  }

  add(containingFile: string, referencedFiles: Iterable<string>): void {
    const normalizedContainingFile = normalize(containingFile);
    for (const file of referencedFiles) {
      const normalizedReferencedFile = normalize(file);
      if (normalizedReferencedFile === normalizedContainingFile) {
        // Containing file is already known to the AOT compiler
        continue;
      }

      const referencing = this.#referencingFiles.get(normalizedReferencedFile);
      if (referencing === undefined) {
        this.#referencingFiles.set(normalizedReferencedFile, new Set([normalizedContainingFile]));
      } else {
        referencing.add(normalizedContainingFile);
      }
    }
  }

  /**
   *
   * @param changed The set of changed files.
   */
  update(changed: Set<string>): Set<string> {
    // Lazily initialized to avoid unneeded copying if there are no additions to return
    let allChangedFiles: Set<string> | undefined;

    // Add referencing files to fully notify the AOT compiler of required component updates
    for (const modifiedFile of changed) {
      const normalizedModifiedFile = normalize(modifiedFile);
      const referencing = this.#referencingFiles.get(normalizedModifiedFile);
      if (referencing) {
        allChangedFiles ??= new Set(changed);
        for (const referencingFile of referencing) {
          allChangedFiles.add(referencingFile);
        }
        // Cleanup the stale record which will be updated by new resource transforms
        this.#referencingFiles.delete(normalizedModifiedFile);
      }
    }

    return allChangedFiles ?? changed;
  }
}
