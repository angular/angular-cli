/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as process from 'process';
import { time, timeEnd } from './benchmark';
import { CancellationToken } from './gather_diagnostics';
import {
  AUTO_START_ARG,
  TypeChecker,
} from './type_checker';
import {
  InitMessage,
  MESSAGE_KIND,
  TypeCheckerMessage,
  UpdateMessage,
} from './type_checker_messages';

let typeChecker: TypeChecker;
let lastCancellationToken: CancellationToken;

// only listen to messages if started from the AngularCompilerPlugin
if (process.argv.indexOf(AUTO_START_ARG) >= 0) {
  process.on('message', (message: TypeCheckerMessage) => {
    time('TypeChecker.message');
    switch (message.kind) {
      case MESSAGE_KIND.Init:
        const initMessage = message as InitMessage;
        typeChecker = new TypeChecker(
          initMessage.compilerOptions,
          initMessage.basePath,
          initMessage.jitMode,
          initMessage.rootNames,
          initMessage.hostReplacementPaths,
        );
        break;
      case MESSAGE_KIND.Update:
        if (!typeChecker) {
          throw new Error('TypeChecker: update message received before initialization');
        }
        if (lastCancellationToken) {
          // This cancellation token doesn't seem to do much, messages don't seem to be processed
          // before the diagnostics finish.
          lastCancellationToken.requestCancellation();
        }
        const updateMessage = message as UpdateMessage;
        lastCancellationToken = new CancellationToken();
        typeChecker.update(updateMessage.rootNames, updateMessage.changedCompilationFiles,
          lastCancellationToken);
        break;
      default:
        throw new Error(`TypeChecker: Unexpected message received: ${message}.`);
    }
    timeEnd('TypeChecker.message');
  });
}
