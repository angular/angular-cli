/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ChildProcess } from 'child_process';
import type { Host } from './host';

// Log messages that we want to catch to identify the build status.

const BUILD_SUCCEEDED_MESSAGE = 'Application bundle generation complete.';
const BUILD_FAILED_MESSAGE = 'Application bundle generation failed.';
const WAITING_FOR_CHANGES_MESSAGE = 'Watch mode enabled. Watching for file changes...';
const CHANGES_DETECTED_START_MESSAGE = '❯ Changes detected. Rebuilding...';
const CHANGES_DETECTED_SUCCESS_MESSAGE = '✔ Changes detected. Rebuilding...';

const BUILD_START_MESSAGES = [CHANGES_DETECTED_START_MESSAGE];
const BUILD_END_MESSAGES = [
  BUILD_SUCCEEDED_MESSAGE,
  BUILD_FAILED_MESSAGE,
  WAITING_FOR_CHANGES_MESSAGE,
  CHANGES_DETECTED_SUCCESS_MESSAGE,
];

export type BuildStatus = 'success' | 'failure' | 'unknown';

/**
 * An Angular development server managed by the MCP server.
 */
export interface Devserver {
  /**
   * Launches the dev server and returns immediately.
   *
   * Throws if this server is already running.
   */
  start(): void;

  /**
   * If the dev server is running, stops it.
   */
  stop(): void;

  /**
   * Gets all the server logs so far (stdout + stderr).
   */
  getServerLogs(): string[];

  /**
   * Gets all the server logs from the latest build.
   */
  getMostRecentBuild(): { status: BuildStatus; logs: string[] };

  /**
   * Whether the dev server is currently being built, or is awaiting further changes.
   */
  isBuilding(): boolean;

  /**
   * `ng serve` port to use.
   */
  port: number;
}

/**
 * A local Angular development server managed by the MCP server.
 */
export class LocalDevserver implements Devserver {
  readonly host: Host;
  readonly port: number;
  readonly project?: string;

  private devserverProcess: ChildProcess | null = null;
  private serverLogs: string[] = [];
  private buildInProgress = false;
  private latestBuildLogStartIndex?: number = undefined;
  private latestBuildStatus: BuildStatus = 'unknown';

  constructor({ host, port, project }: { host: Host; port: number; project?: string }) {
    this.host = host;
    this.project = project;
    this.port = port;
  }

  start() {
    if (this.devserverProcess) {
      throw Error('Dev server already started.');
    }

    const args = ['serve'];
    if (this.project) {
      args.push(this.project);
    }

    args.push(`--port=${this.port}`);

    this.devserverProcess = this.host.spawn('ng', args, { stdio: 'pipe' });
    this.devserverProcess.stdout?.on('data', (data) => {
      this.addLog(data.toString());
    });
    this.devserverProcess.stderr?.on('data', (data) => {
      this.addLog(data.toString());
    });
    this.devserverProcess.stderr?.on('close', () => {
      this.stop();
    });
    this.buildInProgress = true;
  }

  private addLog(log: string) {
    this.serverLogs.push(log);

    if (BUILD_START_MESSAGES.some((message) => log.startsWith(message))) {
      this.buildInProgress = true;
      this.latestBuildLogStartIndex = this.serverLogs.length - 1;
    } else if (BUILD_END_MESSAGES.some((message) => log.startsWith(message))) {
      this.buildInProgress = false;
      // We consider everything except a specific failure message to be a success.
      this.latestBuildStatus = log.startsWith(BUILD_FAILED_MESSAGE) ? 'failure' : 'success';
    }
  }

  stop() {
    this.devserverProcess?.kill();
    this.devserverProcess = null;
  }

  getServerLogs(): string[] {
    return [...this.serverLogs];
  }

  getMostRecentBuild() {
    return {
      status: this.latestBuildStatus,
      logs: this.serverLogs.slice(this.latestBuildLogStartIndex),
    };
  }

  isBuilding() {
    return this.buildInProgress;
  }
}
