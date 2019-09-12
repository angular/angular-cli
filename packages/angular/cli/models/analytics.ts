/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { analytics, json, tags } from '@angular-devkit/core';
import * as child_process from 'child_process';
import * as debug from 'debug';
import { writeFileSync } from 'fs';
import * as inquirer from 'inquirer';
import * as os from 'os';
import * as ua from 'universal-analytics';
import { v4 as uuidV4 } from 'uuid';
import { colors } from '../utilities/color';
import { getWorkspace, getWorkspaceRaw } from '../utilities/config';
import { isTTY } from '../utilities/tty';

// tslint:disable: no-console
const analyticsDebug = debug('ng:analytics'); // Generate analytics, including settings and users.
const analyticsLogDebug = debug('ng:analytics:log'); // Actual logs of events.

const BYTES_PER_GIGABYTES = 1024 * 1024 * 1024;

let _defaultAngularCliPropertyCache: string;
export const AnalyticsProperties = {
  AngularCliProd: 'UA-8594346-29',
  AngularCliStaging: 'UA-8594346-32',
  get AngularCliDefault(): string {
    if (_defaultAngularCliPropertyCache) {
      return _defaultAngularCliPropertyCache;
    }

    const v = require('../package.json').version;

    // The logic is if it's a full version then we should use the prod GA property.
    if (/^\d+\.\d+\.\d+$/.test(v) && v !== '0.0.0') {
      _defaultAngularCliPropertyCache = AnalyticsProperties.AngularCliProd;
    } else {
      _defaultAngularCliPropertyCache = AnalyticsProperties.AngularCliStaging;
    }

    return _defaultAngularCliPropertyCache;
  },
};

/**
 * This is the ultimate safelist for checking if a package name is safe to report to analytics.
 */
export const analyticsPackageSafelist = [
  /^@angular\//,
  /^@angular-devkit\//,
  /^@ngtools\//,
  '@schematics/angular',
  '@schematics/schematics',
  '@schematics/update',
];

export function isPackageNameSafeForAnalytics(name: string) {
  return analyticsPackageSafelist.some(pattern => {
    if (typeof pattern == 'string') {
      return pattern === name;
    } else {
      return pattern.test(name);
    }
  });
}

/**
 * Attempt to get the Windows Language Code string.
 * @private
 */
function _getWindowsLanguageCode(): string | undefined {
  if (!os.platform().startsWith('win')) {
    return undefined;
  }

  try {
    // This is true on Windows XP, 7, 8 and 10 AFAIK. Would return empty string or fail if it
    // doesn't work.
    return child_process
      .execSync('wmic.exe os get locale')
      .toString()
      .trim();
  } catch (_) {}

  return undefined;
}

/**
 * Get a language code.
 * @private
 */
function _getLanguage() {
  // Note: Windows does not expose the configured language by default.
  return (
    process.env.LANG || // Default Unix env variable.
    process.env.LC_CTYPE || // For C libraries. Sometimes the above isn't set.
    process.env.LANGSPEC || // For Windows, sometimes this will be set (not always).
    _getWindowsLanguageCode() ||
    '??'
  ); // ¯\_(ツ)_/¯
}

/**
 * Return the number of CPUs.
 * @private
 */
function _getCpuCount() {
  const cpus = os.cpus();

  // Return "(count)x(average speed)".
  return cpus.length;
}

/**
 * Get the first CPU's speed. It's very rare to have multiple CPUs of different speed (in most
 * non-ARM configurations anyway), so that's all we care about.
 * @private
 */
function _getCpuSpeed() {
  const cpus = os.cpus();

  return Math.floor(cpus[0].speed);
}

/**
 * Get the amount of memory, in megabytes.
 * @private
 */
function _getRamSize() {
  // Report in gigabytes (or closest). Otherwise it's too much noise.
  return Math.round(os.totalmem() / BYTES_PER_GIGABYTES);
}

/**
 * Get the Node name and version. This returns a string like "Node 10.11", or "io.js 3.5".
 * @private
 */
function _getNodeVersion() {
  // We use any here because p.release is a new Node construct in Node 10 (and our typings are the
  // minimal version of Node we support).
  const p = process as any; // tslint:disable-line:no-any
  const name =
    (typeof p.release == 'object' && typeof p.release.name == 'string' && p.release.name) ||
    process.argv0;

  return name + ' ' + process.version;
}

/**
 * Get a numerical MAJOR.MINOR version of node. We report this as a metric.
 * @private
 */
function _getNumericNodeVersion() {
  const p = process.version;
  const m = p.match(/\d+\.\d+/);

  return (m && m[0] && parseFloat(m[0])) || 0;
}

// These are just approximations of UA strings. We just try to fool Google Analytics to give us the
// data we want.
// See https://developers.whatismybrowser.com/useragents/
const osVersionMap: { [os: string]: { [release: string]: string } } = {
  darwin: {
    '1.3.1': '10_0_4',
    '1.4.1': '10_1_0',
    '5.1': '10_1_1',
    '5.2': '10_1_5',
    '6.0.1': '10_2',
    '6.8': '10_2_8',
    '7.0': '10_3_0',
    '7.9': '10_3_9',
    '8.0': '10_4_0',
    '8.11': '10_4_11',
    '9.0': '10_5_0',
    '9.8': '10_5_8',
    '10.0': '10_6_0',
    '10.8': '10_6_8',
    // We stop here because we try to math out the version for anything greater than 10, and it
    // works. Those versions are standardized using a calculation now.
  },
  win32: {
    '6.3.9600': 'Windows 8.1',
    '6.2.9200': 'Windows 8',
    '6.1.7601': 'Windows 7 SP1',
    '6.1.7600': 'Windows 7',
    '6.0.6002': 'Windows Vista SP2',
    '6.0.6000': 'Windows Vista',
    '5.1.2600': 'Windows XP',
  },
};

/**
 * Build a fake User Agent string for OSX. This gets sent to Analytics so it shows the proper OS,
 * versions and others.
 * @private
 */
function _buildUserAgentStringForOsx() {
  let v = osVersionMap.darwin[os.release()];

  if (!v) {
    // Remove 4 to tie Darwin version to OSX version, add other info.
    const x = parseFloat(os.release());
    if (x > 10) {
      v = `10_` + (x - 4).toString().replace('.', '_');
    }
  }

  const cpuModel = os.cpus()[0].model.match(/^[a-z]+/i);
  const cpu = cpuModel ? cpuModel[0] : os.cpus()[0].model;

  return `(Macintosh; ${cpu} Mac OS X ${v || os.release()})`;
}

/**
 * Build a fake User Agent string for Windows. This gets sent to Analytics so it shows the proper
 * OS, versions and others.
 * @private
 */
function _buildUserAgentStringForWindows() {
  return `(Windows NT ${os.release()})`;
}

/**
 * Build a fake User Agent string for Linux. This gets sent to Analytics so it shows the proper OS,
 * versions and others.
 * @private
 */
function _buildUserAgentStringForLinux() {
  return `(X11; Linux i686; ${os.release()}; ${os.cpus()[0].model})`;
}

/**
 * Build a fake User Agent string. This gets sent to Analytics so it shows the proper OS version.
 * @private
 */
function _buildUserAgentString() {
  switch (os.platform()) {
    case 'darwin':
      return _buildUserAgentStringForOsx();

    case 'win32':
      return _buildUserAgentStringForWindows();

    case 'linux':
      return _buildUserAgentStringForLinux();

    default:
      return os.platform() + ' ' + os.release();
  }
}

/**
 * Implementation of the Analytics interface for using `universal-analytics` package.
 */
export class UniversalAnalytics implements analytics.Analytics {
  private _ua: ua.Visitor;
  private _dirty = false;
  private _metrics: (string | number)[] = [];
  private _dimensions: (string | number)[] = [];

  /**
   * @param trackingId The Google Analytics ID.
   * @param uid A User ID.
   */
  constructor(trackingId: string, uid: string) {
    this._ua = ua(trackingId, uid, {
      enableBatching: true,
      batchSize: 5,
    });

    // Add persistent params for appVersion.
    this._ua.set('ds', 'cli');
    this._ua.set('ua', _buildUserAgentString());
    this._ua.set('ul', _getLanguage());

    // @angular/cli with version.
    this._ua.set('an', require('../package.json').name);
    this._ua.set('av', require('../package.json').version);

    // We use the application ID for the Node version. This should be "node 10.10.0".
    // We also use a custom metrics, but
    this._ua.set('aid', _getNodeVersion());

    // We set custom metrics for values we care about.
    this._dimensions[analytics.NgCliAnalyticsDimensions.CpuCount] = _getCpuCount();
    this._dimensions[analytics.NgCliAnalyticsDimensions.CpuSpeed] = _getCpuSpeed();
    this._dimensions[analytics.NgCliAnalyticsDimensions.RamInGigabytes] = _getRamSize();
    this._dimensions[analytics.NgCliAnalyticsDimensions.NodeVersion] = _getNumericNodeVersion();
  }

  /**
   * Creates the dimension and metrics variables to pass to universal-analytics.
   * @private
   */
  private _customVariables(options: analytics.CustomDimensionsAndMetricsOptions) {
    const additionals: { [key: string]: boolean | number | string } = {};
    this._dimensions.forEach((v, i) => (additionals['cd' + i] = v));
    (options.dimensions || []).forEach((v, i) => (additionals['cd' + i] = v));
    this._metrics.forEach((v, i) => (additionals['cm' + i] = v));
    (options.metrics || []).forEach((v, i) => (additionals['cm' + i] = v));

    return additionals;
  }

  event(ec: string, ea: string, options: analytics.EventOptions = {}) {
    const vars = this._customVariables(options);
    analyticsLogDebug('event ec=%j, ea=%j, %j', ec, ea, vars);

    const { label: el, value: ev } = options;
    this._dirty = true;
    this._ua.event({ ec, ea, el, ev, ...vars });
  }
  screenview(cd: string, an: string, options: analytics.ScreenviewOptions = {}) {
    const vars = this._customVariables(options);
    analyticsLogDebug('screenview cd=%j, an=%j, %j', cd, an, vars);

    const { appVersion: av, appId: aid, appInstallerId: aiid } = options;
    this._dirty = true;
    this._ua.screenview({ cd, an, av, aid, aiid, ...vars });
  }
  pageview(dp: string, options: analytics.PageviewOptions = {}) {
    const vars = this._customVariables(options);
    analyticsLogDebug('pageview dp=%j, %j', dp, vars);

    const { hostname: dh, title: dt } = options;
    this._dirty = true;
    this._ua.pageview({ dp, dh, dt, ...vars });
  }
  timing(utc: string, utv: string, utt: string | number, options: analytics.TimingOptions = {}) {
    const vars = this._customVariables(options);
    analyticsLogDebug('timing utc=%j, utv=%j, utl=%j, %j', utc, utv, utt, vars);

    const { label: utl } = options;
    this._dirty = true;
    this._ua.timing({ utc, utv, utt, utl, ...vars });
  }

  flush(): Promise<void> {
    if (!this._dirty) {
      return Promise.resolve();
    }

    this._dirty = false;

    return new Promise(resolve => this._ua.send(resolve));
  }
}

/**
 * Set analytics settings. This does not work if the user is not inside a project.
 * @param level Which config to use. "global" for user-level, and "local" for project-level.
 * @param value Either a user ID, true to generate a new User ID, or false to disable analytics.
 */
export function setAnalyticsConfig(level: 'global' | 'local', value: string | boolean) {
  analyticsDebug('setting %s level analytics to: %s', level, value);
  const [config, configPath] = getWorkspaceRaw(level);
  if (!config || !configPath) {
    throw new Error(`Could not find ${level} workspace.`);
  }

  const configValue = config.value;
  const cli: json.JsonValue = configValue['cli'] || (configValue['cli'] = {});

  if (!json.isJsonObject(cli)) {
    throw new Error(`Invalid config found at ${configPath}. CLI should be an object.`);
  }

  if (value === true) {
    value = uuidV4();
  }
  cli['analytics'] = value;

  const output = JSON.stringify(configValue, null, 2);
  writeFileSync(configPath, output);
  analyticsDebug('done');
}

/**
 * Prompt the user for usage gathering permission.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export async function promptGlobalAnalytics(force = false) {
  analyticsDebug('prompting global analytics.');
  if (force || isTTY()) {
    const answers = await inquirer.prompt<{ analytics: boolean }>([
      {
        type: 'confirm',
        name: 'analytics',
        message: tags.stripIndents`
          Would you like to share anonymous usage data with the Angular Team at Google under
          Google’s Privacy Policy at https://policies.google.com/privacy? For more details and
          how to change this setting, see http://angular.io/analytics.
        `,
        default: false,
      },
    ]);

    setAnalyticsConfig('global', answers.analytics);

    if (answers.analytics) {
      console.log('');
      console.log(tags.stripIndent`
        Thank you for sharing anonymous usage data. If you change your mind, the following
        command will disable this feature entirely:

            ${colors.yellow('ng analytics off')}
      `);
      console.log('');

      // Send back a ping with the user `optin`.
      const ua = new UniversalAnalytics(AnalyticsProperties.AngularCliDefault, 'optin');
      ua.pageview('/telemetry/optin');
      await ua.flush();
    } else {
      // Send back a ping with the user `optout`. This is the only thing we send.
      const ua = new UniversalAnalytics(AnalyticsProperties.AngularCliDefault, 'optout');
      ua.pageview('/telemetry/optout');
      await ua.flush();
    }

    return true;
  } else {
    analyticsDebug('Either STDOUT or STDIN are not TTY and we skipped the prompt.');
  }

  return false;
}

/**
 * Prompt the user for usage gathering permission for the local project. Fails if there is no
 * local workspace.
 * @param force Whether to ask regardless of whether or not the user is using an interactive shell.
 * @return Whether or not the user was shown a prompt.
 */
export async function promptProjectAnalytics(force = false): Promise<boolean> {
  analyticsDebug('prompting user');
  const [config, configPath] = getWorkspaceRaw('local');
  if (!config || !configPath) {
    throw new Error(`Could not find a local workspace. Are you in a project?`);
  }

  if (force || isTTY()) {
    const answers = await inquirer.prompt<{ analytics: boolean }>([
      {
        type: 'confirm',
        name: 'analytics',
        message: tags.stripIndents`
          Would you like to share anonymous usage data about this project with the Angular Team at
          Google under Google’s Privacy Policy at https://policies.google.com/privacy? For more
          details and how to change this setting, see http://angular.io/analytics.

        `,
        default: false,
      },
    ]);

    setAnalyticsConfig('local', answers.analytics);

    if (answers.analytics) {
      console.log('');
      console.log(tags.stripIndent`
        Thank you for sharing anonymous usage data. Would you change your mind, the following
        command will disable this feature entirely:

            ${colors.yellow('ng analytics project off')}
      `);
      console.log('');

      // Send back a ping with the user `optin`.
      const ua = new UniversalAnalytics(AnalyticsProperties.AngularCliDefault, 'optin');
      ua.pageview('/telemetry/project/optin');
      await ua.flush();
    } else {
      // Send back a ping with the user `optout`. This is the only thing we send.
      const ua = new UniversalAnalytics(AnalyticsProperties.AngularCliDefault, 'optout');
      ua.pageview('/telemetry/project/optout');
      await ua.flush();
    }

    return true;
  }

  return false;
}

export async function hasGlobalAnalyticsConfiguration(): Promise<boolean> {
  try {
    const globalWorkspace = await getWorkspace('global');
    const analyticsConfig: string | undefined | null | { uid?: string } =
      globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];

    if (analyticsConfig !== null && analyticsConfig !== undefined) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Get the global analytics object for the user. This returns an instance of UniversalAnalytics,
 * or undefined if analytics are disabled.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
export async function getGlobalAnalytics(): Promise<UniversalAnalytics | undefined> {
  analyticsDebug('getGlobalAnalytics');
  const propertyId = AnalyticsProperties.AngularCliDefault;

  if ('NG_CLI_ANALYTICS' in process.env) {
    if (process.env['NG_CLI_ANALYTICS'] == 'false' || process.env['NG_CLI_ANALYTICS'] == '') {
      analyticsDebug('NG_CLI_ANALYTICS is false');

      return undefined;
    }
    if (process.env['NG_CLI_ANALYTICS'] === 'ci') {
      analyticsDebug('Running in CI mode');

      return new UniversalAnalytics(propertyId, 'ci');
    }
  }

  // If anything happens we just keep the NOOP analytics.
  try {
    const globalWorkspace = await getWorkspace('global');
    const analyticsConfig: string | undefined | null | { uid?: string } =
      globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analytics'];
    analyticsDebug('Client Analytics config found: %j', analyticsConfig);

    if (analyticsConfig === false) {
      analyticsDebug('Analytics disabled. Ignoring all analytics.');

      return undefined;
    } else if (analyticsConfig === undefined || analyticsConfig === null) {
      analyticsDebug('Analytics settings not found. Ignoring all analytics.');

      // globalWorkspace can be null if there is no file. analyticsConfig would be null in this
      // case. Since there is no file, the user hasn't answered and the expected return value is
      // undefined.
      return undefined;
    } else {
      let uid: string | undefined = undefined;
      if (typeof analyticsConfig == 'string') {
        uid = analyticsConfig;
      } else if (typeof analyticsConfig == 'object' && typeof analyticsConfig['uid'] == 'string') {
        uid = analyticsConfig['uid'];
      }

      analyticsDebug('client id: %j', uid);
      if (uid == undefined) {
        return undefined;
      }

      return new UniversalAnalytics(propertyId, uid);
    }
  } catch (err) {
    analyticsDebug('Error happened during reading of analytics config: %s', err.message);

    return undefined;
  }
}

export async function hasWorkspaceAnalyticsConfiguration(): Promise<boolean> {
  try {
    const globalWorkspace = await getWorkspace('local');
    const analyticsConfig: string | undefined | null | { uid?: string } = globalWorkspace
      && globalWorkspace.getCli()
      && globalWorkspace.getCli()['analytics'];

    if (analyticsConfig !== undefined) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Get the workspace analytics object for the user. This returns an instance of UniversalAnalytics,
 * or undefined if analytics are disabled.
 *
 * If any problem happens, it is considered the user has been opting out of analytics.
 */
export async function getWorkspaceAnalytics(): Promise<UniversalAnalytics | undefined> {
  analyticsDebug('getWorkspaceAnalytics');
  try {
    const globalWorkspace = await getWorkspace('local');
    const analyticsConfig: string | undefined | null | { uid?: string } = globalWorkspace
      && globalWorkspace.getCli()
      && globalWorkspace.getCli()['analytics'];
    analyticsDebug('Workspace Analytics config found: %j', analyticsConfig);

    if (analyticsConfig === false) {
      analyticsDebug('Analytics disabled. Ignoring all analytics.');

      return undefined;
    } else if (analyticsConfig === undefined || analyticsConfig === null) {
      analyticsDebug('Analytics settings not found. Ignoring all analytics.');

      return undefined;
    } else {
      let uid: string | undefined = undefined;
      if (typeof analyticsConfig == 'string') {
        uid = analyticsConfig;
      } else if (typeof analyticsConfig == 'object' && typeof analyticsConfig['uid'] == 'string') {
        uid = analyticsConfig['uid'];
      }

      analyticsDebug('client id: %j', uid);
      if (uid == undefined) {
        return undefined;
      }

      return new UniversalAnalytics(AnalyticsProperties.AngularCliDefault, uid);
    }
  } catch (err) {
    analyticsDebug('Error happened during reading of analytics config: %s', err.message);

    return undefined;
  }

}

/**
 * Return the usage analytics sharing setting, which is either a property string (GA-XXXXXXX-XX),
 * or undefined if no sharing.
 */
export async function getSharedAnalytics(): Promise<UniversalAnalytics | undefined> {
  analyticsDebug('getSharedAnalytics');

  const envVarName = 'NG_CLI_ANALYTICS_SHARE';
  if (envVarName in process.env) {
    if (process.env[envVarName] == 'false' || process.env[envVarName] == '') {
      analyticsDebug('NG_CLI_ANALYTICS is false');

      return undefined;
    }
  }

  // If anything happens we just keep the NOOP analytics.
  try {
    const globalWorkspace = await getWorkspace('global');
    const analyticsConfig =
      globalWorkspace && globalWorkspace.getCli() && globalWorkspace.getCli()['analyticsSharing'];

    if (!analyticsConfig || !analyticsConfig.tracking || !analyticsConfig.uuid) {
      return undefined;
    } else {
      analyticsDebug('Analytics sharing info: %j', analyticsConfig);

      return new UniversalAnalytics(analyticsConfig.tracking, analyticsConfig.uuid);
    }
  } catch (err) {
    analyticsDebug('Error happened during reading of analytics sharing config: %s', err.message);

    return undefined;
  }
}
