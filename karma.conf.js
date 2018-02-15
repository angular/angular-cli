
process.env.CHROME_BIN = require('puppeteer').executablePath()

module.exports = function(config) {
  config.set({
    frameworks: ["jasmine", "karma-typescript"],
    files: [
      "modules/**/*.spec.ts"
    ],
    preprocessors: {
      "**/*.ts": "karma-typescript"
    },
    karmaTypescriptConfig: {
      tsconfig: "./tsconfig.json",
    },
    reporters: ["progress", "karma-typescript"],
    browsers: ["ChromeHeadless"]
  });
};
