// Lets a test build sit next to the installed app instead of replacing it.
// A normal build uses app.json exactly as it is. The "preview-v2" build profile in
// eas.json sets APP_VARIANT=v2, which gives the app its own Android (and iPhone) ID and the name
// "Finance Flow 2", so Android installs it as a second, separate app.
module.exports = ({ config }) => {
  if (process.env.APP_VARIANT !== 'v2') return config;
  return {
    ...config,
    name: 'Finance Flow 2',
    android: { ...config.android, package: 'com.cathlauron.householdfinance.v2' },
    ios: { ...config.ios, bundleIdentifier: 'com.cathlauron.householdfinance.v2' },
  };
};
