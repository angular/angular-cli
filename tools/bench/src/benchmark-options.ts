export interface BenchmarkOptions {
  command: string;
  iterations: number;
  extraArgs: string[];
  match: string;
  matchCount: number;
  matchEditFile: string;
  matchEditString: string;
  comment: string;
  logFile: string;
  debug: boolean;
}
