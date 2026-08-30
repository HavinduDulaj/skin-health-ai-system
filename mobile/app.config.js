/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    ingredientsUrl: process.env.EXPO_PUBLIC_INGREDIENTS_URL,
  },
});
