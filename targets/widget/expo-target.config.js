// T40: home and lock screen widget with what waits for an OK, the next event left today and the next reminder.
// The app writes it to the App Group (src/widget/sync.ts); the widget never talks to the server.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'widget',
  name: 'LumiWidget',
  bundleIdentifier: '.widget',
  deploymentTarget: '16.4',
  colors: { $widgetBackground: { color: '#f6f5fb', darkColor: '#10132a' }, $accent: { color: '#5b4bd6', darkColor: '#b5a8ff' } },
  entitlements: { 'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'] },
});
