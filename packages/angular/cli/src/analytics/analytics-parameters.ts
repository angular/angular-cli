/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

export type PrimitiveTypes = string | number | boolean;

/**
 * GA built-in request parameters
 * @see https://www.thyngster.com/ga4-measurement-protocol-cheatsheet
 * @see http://go/depot/google3/analytics/container_tag/templates/common/gold/mpv2_schema.js
 */
export enum RequestParameter {
  ClientId = 'cid',
  DebugView = '_dbg',
  GtmVersion = 'gtm',
  Language = 'ul',
  NewToSite = '_nsi',
  NonInteraction = 'ni',
  PageLocation = 'dl',
  PageTitle = 'dt',
  ProtocolVersion = 'v',
  SessionEngaged = 'seg',
  SessionId = 'sid',
  SessionNumber = 'sct',
  SessionStart = '_ss',
  TrackingId = 'tid',
  TrafficType = 'tt',
  UserAgentArchitecture = 'uaa',
  UserAgentBitness = 'uab',
  UserAgentFullVersionList = 'uafvl',
  UserAgentMobile = 'uamb',
  UserAgentModel = 'uam',
  UserAgentPlatform = 'uap',
  UserAgentPlatformVersion = 'uapv',
  UserId = 'uid',
}

/**
 * User scoped custom dimensions.
 * @notes
 * - User custom dimensions limit is 25.
 * - `up.*` string type.
 * - `upn.*` number type.
 * @see https://support.google.com/analytics/answer/10075209?hl=en
 */
export enum UserCustomDimension {
  UserId = 'up.ng_user_id',
  OsArchitecture = 'up.ng_os_architecture',
  NodeVersion = 'up.ng_node_version',
  NodeMajorVersion = 'upn.ng_node_major_version',
  AngularCLIVersion = 'up.ng_cli_version',
  AngularCLIMajorVersion = 'upn.ng_cli_major_version',
  PackageManager = 'up.ng_package_manager',
  PackageManagerVersion = 'up.ng_pkg_manager_version',
  PackageManagerMajorVersion = 'upn.ng_pkg_manager_major_v',
}

/**
 * Event scoped custom dimensions.
 * @notes
 * - Event custom dimensions limit is 50.
 * - `ep.*` string type.
 * - `epn.*` number type.
 * @see https://support.google.com/analytics/answer/10075209?hl=en
 */
export enum EventCustomDimension {
  Command = 'ep.ng_command',
  SchematicCollectionName = 'ep.ng_schematic_collection_name',
  SchematicName = 'ep.ng_schematic_name',
  Standalone = 'ep.ng_standalone',
  Style = 'ep.ng_style',
  Routing = 'ep.ng_routing',
  InlineTemplate = 'ep.ng_inline_template',
  InlineStyle = 'ep.ng_inline_style',
  BuilderTarget = 'ep.ng_builder_target',
  Aot = 'ep.ng_aot',
  Optimization = 'ep.ng_optimization',
}

/**
 * Event scoped custom mertics.
 * @notes
 * - Event scoped custom mertics limit is 50.
 * - `ep.*` string type.
 * - `epn.*` number type.
 * @see https://support.google.com/analytics/answer/10075209?hl=en
 */
export enum EventCustomMetric {
  AllChunksCount = 'epn.ng_all_chunks_count',
  LazyChunksCount = 'epn.ng_lazy_chunks_count',
  InitialChunksCount = 'epn.ng_initial_chunks_count',
  ChangedChunksCount = 'epn.ng_changed_chunks_count',
  DurationInMs = 'epn.ng_duration_ms',
  CssSizeInBytes = 'epn.ng_css_size_bytes',
  JsSizeInBytes = 'epn.ng_js_size_bytes',
  NgComponentCount = 'epn.ng_component_count',
  AllProjectsCount = 'epn.all_projects_count',
  LibraryProjectsCount = 'epn.libs_projects_count',
  ApplicationProjectsCount = 'epn.apps_projects_count',
}
