// Internal benchmark reporting flag.
// Use with CLI --no-progress flag for best results.
// This should be false for commited code.
const _benchmark = false;

export function time(label: string) {
  if (_benchmark) {
    console.time(label);
  }
}

export function timeEnd(label: string) {
  if (_benchmark) {
    console.timeEnd(label);
  }
}
