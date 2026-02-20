/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Retrieves the list of allowed hosts from the environment variable `NG_ALLOWED_HOSTS`.
 * @returns An array of allowed hosts.
 */
export function getAllowedHostsFromEnv(): ReadonlyArray<string> {
  const allowedHosts: string[] = [];
  const envNgAllowedHosts = process.env['NG_ALLOWED_HOSTS'];
  if (!envNgAllowedHosts) {
    return allowedHosts;
  }

  const hosts = envNgAllowedHosts.split(',');
  for (const host of hosts) {
    const trimmed = host.trim();
    if (trimmed.length > 0) {
      allowedHosts.push(trimmed);
    }
  }

  return allowedHosts;
}
