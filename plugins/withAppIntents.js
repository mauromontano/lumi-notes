// plugins/withAppIntents.js
const { withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Copia el App Intent al target principal en cada prebuild (sobrevive --clean).
module.exports = function withAppIntents(config) {
  return withXcodeProject(config, (cfg) => {
    const projectName = cfg.modRequest.projectName;
    const src = path.join(cfg.modRequest.projectRoot, 'ios-assets', 'DictarNotaIntent.swift');
    const destDir = path.join(cfg.modRequest.platformProjectRoot, projectName);
    fs.copyFileSync(src, path.join(destDir, 'DictarNotaIntent.swift'));
    const relPath = `${projectName}/DictarNotaIntent.swift`;
    if (!cfg.modResults.hasFile(relPath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relPath,
        groupName: projectName,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
};
