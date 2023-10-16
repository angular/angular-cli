/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export class FileReferenceTracker {
  #referencingFiles = new Map<string, Set<string>>();

  get referencedFiles() {
    return this.#referencingFiles.keys();
  }

  add(containingFile: string, referencedFiles: Iterable<string>): void {
    for (const file of referencedFiles) {
      if (file === containingFile) {
        // Containing file is already known to the AOT compiler
        continue;
      }

      const referencing = this.#referencingFiles.get(file);
      if (referencing === undefined) {
        this.#referencingFiles.set(file, new Set([containingFile]));
      } else {
        referencing.add(containingFile);
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
      const referencing = this.#referencingFiles.get(modifiedFile);
      if (referencing) {
        allChangedFiles ??= new Set(changed);
        for (const referencingFile of referencing) {
          allChangedFiles.add(referencingFile);
        }
        // Cleanup the stale record which will be updated by new resource transforms
        this.#referencingFiles.delete(modifiedFile);
      }
    }

    return allChangedFiles ?? changed;
  }
}
