const os = require('os');

class Logger {
  #isVerboseModeEnabled = false;
  #isQuietModeEnabled = false;

  constructor(verbose = false, quiet = false) {
    this.#isVerboseModeEnabled = verbose;
    this.#isQuietModeEnabled = quiet;
  }

  log(...data) {
    if (this.#isQuietModeEnabled) {
      return;
    }

    if (this.#isVerboseModeEnabled) {
      const systemInfo = this.getSystemInfo();
      console.log('[LOG]', new Date().toISOString());
      console.log(...data);
      console.log('[SYSTEM INFO]', systemInfo);
      console.log('---');
      return;
    }

    console.log(...data);
  }

  getSystemInfo() {
    return {
      timestamp: new Date().toISOString(),
      platform: os.platform(),
      arch: os.arch(),
      totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      cpus: os.cpus()[0]?.model || 'Unknown',
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg().map(v => v.toFixed(2))
    };
  }
}

module.exports = Logger;