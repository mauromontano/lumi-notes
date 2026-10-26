// T40: adds native/AskLumiIntent.swift (the Siri intent and its phrases) to the app target. App Intents have to be
// compiled into the app itself for Siri to read the phrases, so it cannot ride in a pod or an extension.
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const { copyFileSync } = require('node:fs');
const { join } = require('node:path');
const FILE = 'AskLumiIntent.swift';
module.exports = function withAskLumiIntent(config) {
  config = withDangerousMod(config, ['ios', mod => {
    const name = IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot);
    copyFileSync(join(mod.modRequest.projectRoot, 'native', FILE), join(mod.modRequest.platformProjectRoot, name, FILE));
    return mod;
  }]);
  return withXcodeProject(config, mod => {
    const name = IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot);
    if (!mod.modResults.hasFile(`${name}/${FILE}`)) IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: `${name}/${FILE}`, groupName: name, project: mod.modResults });
    return mod;
  });
};
