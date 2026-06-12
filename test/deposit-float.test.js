const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const StellarSdk = require('@stellar/stellar-sdk');
const {
  calculateRequiredFloat,
  depositFloat,
} = require('../src/wagestreamafrica');

function createMockServer(publicKey) {
  return {
    submittedTransaction: null,
    async loadAccount(accountId) {
      assert.equal(accountId, publicKey);
      return new StellarSdk.Account(publicKey, '1');
    },
    async submitTransaction(transaction) {
      this.submittedTransaction = transaction;
      return {
        hash: 'mock-float-deposit-hash',
        successful: true,
      };
    },
  };
}

const originalLog = console.log;
const originalError = console.error;

beforeEach(() => {
  console.log = () => {};
  console.error = () => {};
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
});

test('calculateRequiredFloat sums registered worker daily rates', () => {
  assert.equal(
    calculateRequiredFloat([
      { name: 'AdebolaBolt', dailyRate: 15 },
      { name: 'KemiDispatch', dailyRate: 20 },
    ]),
    35
  );
});

test('depositFloat records a sufficient employer float on Stellar', async () => {
  const sourceKeypair = StellarSdk.Keypair.random();
  const server = createMockServer(sourceKeypair.publicKey());

  const result = await depositFloat(
    'LagosFleet',
    45,
    [
      { name: 'AdebolaBolt', dailyRate: 15 },
      { name: 'KemiDispatch', dailyRate: 20 },
    ],
    {
      publicKey: sourceKeypair.publicKey(),
      secretKey: sourceKeypair.secret(),
      server,
    }
  );

  assert.equal(result.hash, 'mock-float-deposit-hash');
  assert.deepEqual(result.confirmation, {
    employerName: 'LagosFleet',
    depositAmount: 45,
    requiredFloat: 35,
    workerCount: 2,
    transactionHash: 'mock-float-deposit-hash',
  });

  const operations = server.submittedTransaction.operations;
  assert.equal(operations.length, 1);
  assert.equal(operations[0].type, 'manageData');
  assert.equal(operations[0].name, 'float_LagosFleet');
  assert.equal(operations[0].value.toString(), '45XLM_2workers');
});

test('depositFloat rejects deposits below the required worker float', async () => {
  const sourceKeypair = StellarSdk.Keypair.random();

  await assert.rejects(
    depositFloat(
      'LagosFleet',
      10,
      [
        { name: 'AdebolaBolt', dailyRate: 15 },
        { name: 'KemiDispatch', dailyRate: 20 },
      ],
      {
        publicKey: sourceKeypair.publicKey(),
        secretKey: sourceKeypair.secret(),
        server: createMockServer(sourceKeypair.publicKey()),
      }
    ),
    /below required worker float 35/
  );
});
