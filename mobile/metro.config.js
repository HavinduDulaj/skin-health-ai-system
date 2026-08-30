const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes("ttf")) {
  config.resolver.assetExts.push("ttf");
}

module.exports = config;
