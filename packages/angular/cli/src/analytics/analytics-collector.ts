/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { randomUUID } from 'node:crypto';
import * as https from 'node:https';
import * as os from 'node:os';
import * as querystring from 'node:querystring';
import * as semver from 'semver';
import type { CommandContext } from '../command-builder/command-module';
import { ngDebug } from '../utilities/environment-options';
import { assertIsError } from '../utilities/error';
import { VERSION } from '../utilities/version';
import {
  EventCustomDimension,
  EventCustomMetric,
  PrimitiveTypes,
  RequestParameter,
  UserCustomDimension,
} from './analytics-parameters';

const TRACKING_ID_PROD = 'G-VETNJBW8L4';
const TRACKING_ID_STAGING = 'G-TBMPRL1BTM';

export class AnalyticsCollector {
  private trackingEventsQueue: Record<string, PrimitiveTypes | undefined>[] | undefined;
  private readonly requestParameterStringified: string;
  private readonly userParameters: Record<UserCustomDimension, PrimitiveTypes | undefined>;

  constructor(
    private context: CommandContext,
    userId: string,
  ) {
    const requestParameters: Partial<Record<RequestParameter, PrimitiveTypes>> = {
      [RequestParameter.ProtocolVersion]: 2,
      [RequestParameter.ClientId]: userId,
      [RequestParameter.UserId]: userId,
      [RequestParameter.TrackingId]:
        /^\d+\.\d+\.\d+$/.test(VERSION.full) && VERSION.full !== '0.0.0'
          ? TRACKING_ID_PROD
          : TRACKING_ID_STAGING,

      // Built-in user properties
      [RequestParameter.SessionId]: randomUUID(),
      [RequestParameter.UserAgentArchitecture]: os.arch(),
      [RequestParameter.UserAgentPlatform]: os.platform(),
      [RequestParameter.UserAgentPlatformVersion]: os.release(),
      [RequestParameter.UserAgentMobile]: 0,
      [RequestParameter.SessionEngaged]: 1,
      // The below is needed for tech details to be collected.
      [RequestParameter.UserAgentFullVersionList]:
        'Google%20Chrome;111.0.5563.64|Not(A%3ABrand;8.0.0.0|Chromium;111.0.5563.64',
    };

    if (ngDebug) {
      requestParameters[RequestParameter.DebugView] = 1;
    }

    this.requestParameterStringified = querystring.stringify(requestParameters);

    const parsedVersion = semver.parse(process.version);
    const packageManagerVersion = context.packageManager.version;

    this.userParameters = {
      // While architecture is being collect by GA as UserAgentArchitecture.
      // It doesn't look like there is a way to query this. Therefore we collect this as a custom user dimension too.
      [UserCustomDimension.OsArchitecture]: os.arch(),
      // While User ID is being collected by GA, this is not visible in reports/for filtering.
      [UserCustomDimension.UserId]: userId,
      [UserCustomDimension.NodeVersion]: parsedVersion
        ? `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`
        : 'other',
      [UserCustomDimension.NodeMajorVersion]: parsedVersion?.major,
      [UserCustomDimension.PackageManager]: context.packageManager.name,
      [UserCustomDimension.PackageManagerVersion]: packageManagerVersion,
      [UserCustomDimension.PackageManagerMajorVersion]: packageManagerVersion
        ? +packageManagerVersion.split('.', 1)[0]
        : undefined,
      [UserCustomDimension.AngularCLIVersion]: VERSION.full,
      [UserCustomDimension.AngularCLIMajorVersion]: VERSION.major,
    };
  }

  reportWorkspaceInfoEvent(
    parameters: Partial<Record<EventCustomMetric, string | boolean | number | undefined>>,
  ): void {
    this.event('workspace_info', parameters);
  }

  reportRebuildRunEvent(
    parameters: Partial<
      Record<EventCustomMetric & EventCustomDimension, string | boolean | number | undefined>
    >,
  ): void {
    this.event('run_rebuild', parameters);
  }

  reportBuildRunEvent(
    parameters: Partial<
      Record<EventCustomMetric & EventCustomDimension, string | boolean | number | undefined>
    >,
  ): void {
    this.event('run_build', parameters);
  }

  reportArchitectRunEvent(parameters: Partial<Record<EventCustomDimension, PrimitiveTypes>>): void {
    this.event('run_architect', parameters);
  }

  reportSchematicRunEvent(parameters: Partial<Record<EventCustomDimension, PrimitiveTypes>>): void {
    this.event('run_schematic', parameters);
  }

  reportCommandRunEvent(command: string): void {
    this.event('run_command', { [EventCustomDimension.Command]: command });
  }

  private event(eventName: string, parameters?: Record<string, PrimitiveTypes>): void {
    this.trackingEventsQueue ??= [];
    this.trackingEventsQueue.push({
      ...this.userParameters,
      ...parameters,
      'en': eventName,
    });
  }

  /**
   * Flush on an interval (if the event loop is waiting).
   *
   * @returns a method that when called will terminate the periodic
   * flush and call flush one last time.
   */
  periodFlush(): () => Promise<void> {
    let analyticsFlushPromise = Promise.resolve();
    const analyticsFlushInterval = setInterval(() => {
      if (this.trackingEventsQueue?.length) {
        analyticsFlushPromise = analyticsFlushPromise.then(() => this.flush());
      }
    }, 4000);

    return () => {
      clearInterval(analyticsFlushInterval);

      // Flush one last time.
      return analyticsFlushPromise.then(() => this.flush());
    };
  }

  async flush(): Promise<void> {
    const pendingTrackingEvents = this.trackingEventsQueue;
    this.context.logger.debug(`Analytics flush size. ${pendingTrackingEvents?.length}.`);

    if (!pendingTrackingEvents?.length) {
      return;
    }

    // The below is needed so that if flush is called multiple times,
    // we don't report the same event multiple times.
    this.trackingEventsQueue = undefined;

    try {
      await this.send(pendingTrackingEvents);
    } catch (error) {
      // Failure to report analytics shouldn't crash the CLI.
      assertIsError(error);
      this.context.logger.debug(`Send analytics error. ${error.message}.`);
    }
  }

  private async send(data: Record<string, PrimitiveTypes | undefined>[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const request = https.request(
        {
          host: 'www.google-analytics.com',
          method: 'POST',
          path: '/g/collect?' + this.requestParameterStringified,
          headers: {
            // The below is needed for tech details to be collected even though we provide our own information from the OS Node.js module
            'user-agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
          },
        },
        (response) => {
          // The below is needed as otherwise the response will never close which will cause the CLI not to terminate.
          response.on('data', () => {});

          if (response.statusCode !== 200 && response.statusCode !== 204) {
            reject(
              new Error(`Analytics reporting failed with status code: ${response.statusCode}.`),
            );
          } else {
            resolve();
          }
        },
      );

      request.on('error', reject);
      const queryParameters = data.map((p) => querystring.stringify(p)).join('\n');
      request.write(queryParameters);
      request.end();
    });
  }
}
