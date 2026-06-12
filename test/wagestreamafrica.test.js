const StellarSdk = require('@stellar/stellar-sdk');
const {
  calculateWageAdvance,
  requestWageAdvance,
} = require('../src/wagestreamafrica');

function createMockServer(publicKey) {
  return {
    submittedTransaction: null,
    async loadAccount(accountId) {
      expect(accountId).toBe(publicKey);
      return new StellarSdk.Account(publicKey, '1');
    },
    async submitTransaction(transaction) {
      this.submittedTransaction = transaction;
      return {
        hash: 'mock-wage-advance-hash',
        successful: true,
      };
    },
  };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('calculateWageAdvance returns the earned amount', () => {
  expect(calculateWageAdvance(3, 15)).toBe(45);
});

test('requestWageAdvance submits a manageData transaction for valid input', async () => {
  const sourceKeypair = StellarSdk.Keypair.random();
  const server = createMockServer(sourceKeypair.publicKey());

  const result = await requestWageAdvance('AdebolaBolt', 3, 15, {
    publicKey: sourceKeypair.publicKey(),
    secretKey: sourceKeypair.secret(),
    server,
  });

  expect(result.hash).toBe('mock-wage-advance-hash');
  expect(server.submittedTransaction).toBeTruthy();

  const operations = server.submittedTransaction.operations;
  expect(operations).toHaveLength(1);
  expect(operations[0].type).toBe('manageData');
  expect(operations[0].name).toBe('advance_AdebolaBolt');
  expect(operations[0].value.toString()).toBe('45XLM_3days');
});

test('requestWageAdvance rejects negative days worked', async () => {
  const sourceKeypair = StellarSdk.Keypair.random();

  await expect(
    requestWageAdvance('AdebolaBolt', -1, 15, {
      publicKey: sourceKeypair.publicKey(),
      secretKey: sourceKeypair.secret(),
      server: createMockServer(sourceKeypair.publicKey()),
    })
  ).rejects.toThrow('Days worked must be greater than zero');
});

test('requestWageAdvance rejects zero daily rate', async () => {
  const sourceKeypair = StellarSdk.Keypair.random();

  await expect(
    requestWageAdvance('AdebolaBolt', 3, 0, {
      publicKey: sourceKeypair.publicKey(),
      secretKey: sourceKeypair.secret(),
      server: createMockServer(sourceKeypair.publicKey()),
    })
  ).rejects.toThrow('Daily rate must be greater than zero');
});
