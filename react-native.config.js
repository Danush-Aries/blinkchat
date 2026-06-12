module.exports = {
  project: {
    android: {
      sourceDir: './android',
    },
    ios: {
      sourceDir: './ios',
    },
  },
  dependencies: {
    'react-native-tcp-socket': {
      platforms: {
        android: null, // link on Android
        ios: null,     // link on iOS
      },
    },
  },
};
