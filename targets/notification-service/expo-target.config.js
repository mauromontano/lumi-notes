// T40: draws the bot's character next to its push. The extension turns each push into a communication
// notification (INSendMessageIntent) whose sender is the bot, with its portrait from ./characters.
// Portraits: npm run generate:characters.
const slugs = ['lumi', 'finanzas', 'playio', 'gym', 'compras', 'trabajo', 'viajes', 'abogado'];
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'notification-service',
  name: 'LumiNotifications',
  bundleIdentifier: '.notifications',
  deploymentTarget: '16.4',
  frameworks: ['Intents'],
  images: Object.fromEntries(slugs.map(slug => [`char-${slug}`, `./characters/${slug}.png`])),
});
