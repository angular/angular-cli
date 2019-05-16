/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SpawnOptions, spawn } from 'child_process';
import { Observable, Subject, from, timer } from 'rxjs';
import { concatMap, map, onErrorResumeNext, tap } from 'rxjs/operators';
import { Command } from './command';
import { AggregatedProcessStats, MonitoredProcess } from './interfaces';
const pidusage = require('pidusage');
const pidtree = require('pidtree');
const treeKill = require('tree-kill');


// Cleanup when the parent process exits.
const defaultProcessExitCb = () => { };
let processExitCb = defaultProcessExitCb;
process.on('exit', () => {
  processExitCb();
  processExitCb = defaultProcessExitCb;
});

export class LocalMonitoredProcess implements MonitoredProcess {
  private stats = new Subject<AggregatedProcessStats>();
  private stdout = new Subject<Buffer>();
  private stderr = new Subject<Buffer>();
  private pollingRate = 100;
  stats$: Observable<AggregatedProcessStats> = this.stats.asObservable();
  stdout$: Observable<Buffer> = this.stdout.asObservable();
  stderr$: Observable<Buffer> = this.stderr.asObservable();

  constructor(private command: Command) { }

  run(): Observable<number> {
    return new Observable(obs => {
      const { cmd, cwd, args } = this.command;
      const spawnOptions: SpawnOptions = { cwd: cwd, shell: true };

      // Spawn the process.
      const childProcess = spawn(cmd, args, spawnOptions);

      // Emit output and stats.
      childProcess.stdout.on('data', (data: Buffer) => this.stdout.next(data));
      childProcess.stderr.on('data', (data: Buffer) => this.stderr.next(data));
      const statsSubs = timer(0, this.pollingRate).pipe(
        concatMap(() => from(pidtree(childProcess.pid, { root: true }))),
        concatMap((pids: number[]) => from(pidusage(pids, { maxage: 5 * this.pollingRate }))),
        map((statsByProcess: { [key: string]: AggregatedProcessStats }) => {
          // Ignore the spawned shell in the total process number.
          const pids = Object.keys(statsByProcess)
            .filter(pid => pid != childProcess.pid.toString());
          const processes = pids.length;
          // We want most stats from the parent process.
          const { pid, ppid, ctime, elapsed, timestamp } = statsByProcess[childProcess.pid];
          // CPU and memory should be agreggated.
          let cpu = 0, memory = 0;
          for (const pid of pids) {
            cpu += statsByProcess[pid].cpu;
            memory += statsByProcess[pid].memory;
          }

          return {
            processes, cpu, memory, pid, ppid, ctime, elapsed, timestamp,
          } as AggregatedProcessStats;
        }),
        tap(stats => this.stats.next(stats)),
        onErrorResumeNext(),
      ).subscribe();

      // Process event handling.

      // Killing processes cross platform can be hard, treeKill helps.
      const killChildProcess = () => {
        if (childProcess && childProcess.pid) {
          treeKill(childProcess.pid, 'SIGTERM');
        }
      };

      // Convert process exit codes and errors into observable events.
      const handleChildProcessExit = (code?: number, error?: Error) => {
        // Stop gathering stats and complete subjects.
        statsSubs.unsubscribe();
        this.stats.complete();
        this.stdout.complete();
        this.stderr.complete();

        // Kill hanging child processes and emit error/exit code.
        killChildProcess();
        if (error) {
          obs.error(error);
        }
        obs.next(code);
        obs.complete();
      };
      childProcess.once('exit', handleChildProcessExit);
      childProcess.once('error', (err) => handleChildProcessExit(1, err));
      processExitCb = killChildProcess;

      // Cleanup on unsubscription.
      return () => childProcess.kill();
    });
  }
}
