const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': require.resolve('react-native-quick-crypto'),
  'buffer': require.resolve('buffer'),
  'stream': require.resolve('stream-browserify'),
};

module.exports = config;
