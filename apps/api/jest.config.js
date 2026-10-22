/** Testes unitários: domínio e casos de uso, sem banco nem rede. */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json', diagnostics: false }] },
  testEnvironment: 'node',
};
