const winston = require('winston');
const path = require('path');
const fs = require('fs');

function createWinstonLogger(verbose = false, quiet = false) {
  const transports = [];

  if (process.env.NODE_ENV === 'production') {
    try {
      fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });
    } catch (e) {}

    transports.push(new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'combined.log'),
      level: 'info',
      maxsize: 5 * 1024 * 1024
    }));

    transports.push(new winston.transports.File({
      filename: path.join(__dirname, 'logs', 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024
    }));
  } else {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  }

  const logger = winston.createLogger({
    level: verbose ? 'debug' : 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    transports
  });

  return {
    info: (...args) => { if (!quiet) logger.info(...args); },
    error: (...args) => { if (!quiet) logger.error(...args); },
    warn: (...args) => { if (!quiet) logger.warn(...args); },
    debug: (...args) => { if (!quiet) logger.debug(...args); },
    log: (...args) => { if (!quiet) logger.info(...args); },
    raw: () => logger
  };
}

module.exports = createWinstonLogger;
