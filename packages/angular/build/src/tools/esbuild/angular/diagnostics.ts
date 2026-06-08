/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PartialMessage, PartialNote } from 'esbuild';
import { platform } from 'node:os';
import type ts from 'typescript';

/**
 * Converts TypeScript Diagnostic related information into an esbuild compatible note object.
 * Related information is a subset of a full TypeScript Diagnostic and also used for diagnostic
 * notes associated with the main Diagnostic.
 * @param info The TypeScript diagnostic relative information to convert.
 * @returns An esbuild diagnostic message as a PartialMessage object
 */
function convertTypeScriptDiagnosticInfo(
  typescript: typeof ts,
  info: ts.DiagnosticRelatedInformation,
  textPrefix?: string,
): PartialNote {
  const newLine = platform() === 'win32' ? '\r\n' : '\n';
  let text = typescript.flattenDiagnosticMessageText(info.messageText, newLine);
  if (textPrefix) {
    text = textPrefix + text;
  }

  const note: PartialNote = { text };

  if (info.file) {
    note.location = {
      file: info.file.fileName,
      length: info.length,
    };

    // Calculate the line/column location and extract the full line text that has the diagnostic
    if (info.start) {
      const { line, character } = typescript.getLineAndCharacterOfPosition(info.file, info.start);
      note.location.line = line + 1;
      note.location.column = character;

      // The start position for the slice is the first character of the error line
      const lineStartPosition = typescript.getPositionOfLineAndCharacter(info.file, line, 0);

      // The end position for the slice is the first character of the next line or the length of
      // the entire file if the line is the last line of the file (getPositionOfLineAndCharacter
      // will error if a nonexistent line is passed).
      const { line: lastLineOfFile } = typescript.getLineAndCharacterOfPosition(
        info.file,
        info.file.text.length - 1,
      );
      const lineEndPosition =
        line < lastLineOfFile
          ? typescript.getPositionOfLineAndCharacter(info.file, line + 1, 0)
          : info.file.text.length;

      note.location.lineText = info.file.text.slice(lineStartPosition, lineEndPosition).trimEnd();
    }
  }

  return note;
}

/**
 * Converts a TypeScript Diagnostic message into an esbuild compatible message object.
 * @param diagnostic The TypeScript diagnostic to convert.
 * @returns An esbuild diagnostic message as a PartialMessage object
 */
export function convertTypeScriptDiagnostic(
  typescript: typeof ts,
  diagnostic: ts.Diagnostic,
): PartialMessage {
  let codePrefix = 'TS';
  let code = `${diagnostic.code}`;

  // Custom ngtsc diagnostics are prefixed with -99 which isn't a valid TypeScript diagnostic code.
  // Strip it and mark the diagnostic as coming from Angular. Note that we can't rely on
  // `diagnostic.source`, because it isn't always produced. This is identical to:
  // https://github.com/angular/angular/blob/main/packages/compiler-cli/src/ngtsc/diagnostics/src/util.ts
  if (code.startsWith('-99')) {
    codePrefix = 'NG';
    code = code.slice(3);
  }

  const message: PartialMessage = convertTypeScriptDiagnosticInfo(
    typescript,
    diagnostic,
    `${codePrefix}${code}: `,
  );

  if (diagnostic.relatedInformation?.length) {
    message.notes = diagnostic.relatedInformation.map((info) =>
      convertTypeScriptDiagnosticInfo(typescript, info),
    );
  }

  return message;
}
