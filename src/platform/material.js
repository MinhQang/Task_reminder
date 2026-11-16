'use strict';
const os = require('node:os');
function supportsAcrylic(platform = process.platform, release = os.release()) {
  return platform === 'win32' && Number(release.split('.')[2]) >= 22621;
}
module.exports = { supportsAcrylic };
