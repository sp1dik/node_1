module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'task/**/*.js',
    '!task/server.js',
    '!task/db.js',
    '!task/public/**',
    '!task/migrate.js',
    '!task/*.json',
    '!task/winstonLogger.js'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  }
};
