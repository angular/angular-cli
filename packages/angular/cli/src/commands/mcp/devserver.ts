/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ChildProcess } from 'node:child_process';
import { type Host, processStreamLines } from './host';

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
 * The outcome of a manually requested rebuild, as reported by the development server.
 */
export type RebuildStatus = 'success' | 'failure' | 'no-changes' | 'cancelled';

/**
 * The development server route used to request a rebuild when manual rebuild mode is enabled.
 */
export const REBUILD_ROUTE = '/__ng_rebuild';

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
   * Requests an incremental rebuild of all pending file changes. Only supported when the
   * dev server was started in manual rebuild mode.
   *
   * Resolves once the rebuild has completed.
   */
  requestRebuild(): Promise<RebuildStatus>;

  /**
   * `ng serve` port to use.
   */
  port: number;

  /**
   * Whether the dev server only rebuilds when explicitly requested.
   */
  manualRebuild: boolean;

  /**
   * The workspace path for this server.
   */
  workspacePath: string;

  /**
   * The project name for this server.
   */
  project: string;
}

/**
 * A local Angular development server managed by the MCP server.
 */
export class LocalDevserver implements Devserver {
  readonly host: Host;
  readonly port: number;
  readonly workspacePath: string;
  readonly project: string;
  readonly manualRebuild: boolean;

  private devserverProcess: ChildProcess | null = null;
  private serverLogs: string[] = [];
  private buildInProgress = false;
  private latestBuildLogStartIndex?: number = undefined;
  private latestBuildStatus: BuildStatus = 'unknown';

  constructor({
    host,
    port,
    workspacePath,
    project,
    manualRebuild = false,
  }: {
    host: Host;
    port: number;
    workspacePath: string;
    project: string;
    manualRebuild?: boolean;
  }) {
    this.host = host;
    this.port = port;
    this.workspacePath = workspacePath;
    this.project = project;
    this.manualRebuild = manualRebuild;
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

    if (this.manualRebuild) {
      args.push('--manual-rebuild');
    }

    this.devserverProcess = this.host.startNgProcess(args, {
      stdio: 'pipe',
      cwd: this.workspacePath,
    });
    processStreamLines(this.devserverProcess.stdout, (line) => this.addLog(line));
    processStreamLines(this.devserverProcess.stderr, (line) => this.addLog(line));

    this.devserverProcess.on('close', () => {
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
    // A stopped or crashed server is never building.
    return !!this.devserverProcess && this.buildInProgress;
  }

  async requestRebuild(): Promise<RebuildStatus> {
    if (!this.manualRebuild) {
      throw new Error(
        `Development server for project '${this.project}' was not started in manual rebuild mode.`,
      );
    }
    if (!this.devserverProcess) {
      throw new Error(`Development server for project '${this.project}' is not running.`);
    }

    const response = await fetch(new URL(REBUILD_ROUTE, `http://localhost:${this.port}`), {
      method: 'POST',
    });
    let body: { status?: RebuildStatus } | undefined;
    try {
      body = (await response.json()) as { status?: RebuildStatus };
    } catch {}

    if (!body?.status) {
      throw new Error(
        `Unexpected rebuild response from the development server (HTTP ${response.status}).`,
      );
    }

    return body.status;
  }
}

export function getDevserverKey(workspacePath: string, projectName: string): string {
  return `${workspacePath}:${projectName}`;
}

export function createDevServerNotFoundError(
  devservers: Map<string, { project: string; workspacePath: string }>,
): Error {
  if (devservers.size === 0) {
    return new Error('No development servers are currently running.');
  }

  const runningServers = Array.from(devservers.values())
    .map((server) => `- Project '${server.project}' in workspace path '${server.workspacePath}'`)
    .join('\n');

  return new Error(
    `Dev server not found. Currently running servers:\n${runningServers}\n` +
      'Please provide the correct workspace and project arguments.',
  );
}
