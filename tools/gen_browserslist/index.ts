(async () => {
  const { getCompatibleVersions } = await import('baseline-browser-mapping');

  const browsers = {
    chrome: 'Chrome',
    chrome_android: 'ChromeAndroid',
    edge: 'Edge',
    firefox: 'Firefox',
    firefox_android: 'FirefoxAndroid',
    safari: 'Safari',
    safari_ios: 'iOS',
  } as const;

  const baselineBrowserslistConfig = getCompatibleVersions({
    widelyAvailableOnDate: '2025-01-01',
    includeDownstreamBrowsers: false,
  })
    .filter((version) => browsers[version.browser as keyof typeof browsers])
    .map(
      (version) => `${browsers[version.browser as keyof typeof browsers]} >= ${version.version}`,
    );

  for (const line of baselineBrowserslistConfig) console.log(line);
})();
