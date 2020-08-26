export interface AggregatedMetric extends Metric {
    componentValues: number[];
}

export interface AggregatedProcessStats {
    cpu: number;
    ctime: number;
    elapsed: number;
    memory: number;
    pid: number;
    ppid: number;
    processes: number;
    timestamp: number;
}

export declare const aggregateMetricGroups: (g1: MetricGroup, g2: MetricGroup) => MetricGroup;

export declare const aggregateMetrics: (m1: Metric | AggregatedMetric, m2: Metric | AggregatedMetric) => AggregatedMetric;

export declare type BenchmarkReporter = (command: Command, groups: MetricGroup[]) => void;

export declare type Capture = (stats: Observable<AggregatedProcessStats>) => Observable<MetricGroup>;

export declare class Command {
    args: string[];
    cmd: string;
    cwd: string;
    expectedExitCode: number;
    constructor(cmd: string, args?: string[], cwd?: string, expectedExitCode?: number);
    toString(): string;
}

export declare const cumulativeMovingAverage: (acc: number, val: number, accSize: number) => number;

export declare const defaultReporter: (logger: logging.Logger) => BenchmarkReporter;

export declare const defaultStatsCapture: Capture;

export declare class LocalMonitoredProcess implements MonitoredProcess {
    stats$: Observable<AggregatedProcessStats>;
    stderr$: Observable<Buffer>;
    stdout$: Observable<Buffer>;
    constructor(command: Command, useProcessTime?: boolean);
    resetElapsedTimer(): void;
    run(): Observable<number>;
}

export declare function main({ args, stdout, stderr, }: MainOptions): Promise<0 | 1>;

export interface MainOptions {
    args: string[];
    stderr?: ProcessOutput;
    stdout?: ProcessOutput;
}

export declare const max: (v1: number, v2: number) => number;

export declare class MaximumRetriesExceeded extends BaseException {
    constructor(retries: number);
}

export interface Metric {
    componentValues?: number[];
    name: string;
    unit: string;
    value: number;
}

export interface MetricGroup {
    metrics: (Metric | AggregatedMetric)[];
    name: string;
}

export interface MonitoredProcess {
    stats$: Observable<AggregatedProcessStats>;
    stderr$: Observable<Buffer>;
    stdout$: Observable<Buffer>;
    run(): Observable<number>;
    toString(): string;
}

export declare function runBenchmark({ command, captures, reporters, iterations, retries, logger, }: RunBenchmarkOptions): Observable<MetricGroup[]>;

export interface RunBenchmarkOptions {
    captures: Capture[];
    command: Command;
    expectedExitCode?: number;
    iterations?: number;
    logger?: logging.Logger;
    reporters: BenchmarkReporter[];
    retries?: number;
}

export declare function runBenchmarkWatch({ command, captures, reporters, iterations, retries, logger, watchMatcher, watchTimeout, watchCommand, }: RunBenchmarkWatchOptions): Observable<MetricGroup[]>;

export interface RunBenchmarkWatchOptions extends RunBenchmarkOptions {
    watchCommand: Command;
    watchMatcher: string;
    watchTimeout?: number;
}
