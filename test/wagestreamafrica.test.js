const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TESTNET_USDC_ISSUER,
  formatStellarAmount,
  getUsdcAsset,
  getUsdcBalance,
  hasUsdcTrustline,
  requestWageAdvance,
} = require('../src/wagestreamafrica');

function accountWithBalances(balances) {
  return { balances };
}

test('builds the Stellar testnet USDC asset', () => {
  const asset = getUsdcAsset();

  assert.equal(asset.getCode(), 'USDC');
  assert.equal(asset.getIssuer(), TESTNET_USDC_ISSUER);
});

test('formats Stellar amounts without exceeding 7 decimals', () => {
  assert.equal(formatStellarAmount(45), '45');
  assert.equal(formatStellarAmount(45.5), '45.5');
  assert.equal(formatStellarAmount(0.12345678), '0.1234568');
});

test('rejects non-positive disbursement amounts', () => {
  assert.throws(() => formatStellarAmount(0), /positive number/);
  assert.throws(() => formatStellarAmount(-1), /positive number/);
});

test('reads the employer USDC float balance from the matching trustline', () => {
  const account = accountWithBalances([
    { asset_type: 'native', balance: '100' },
    { asset_code: 'USDC', asset_issuer: 'OTHER', balance: '3.5' },
    { asset_code: 'USDC', asset_issuer: TESTNET_USDC_ISSUER, balance: '250.0000000' },
  ]);

  assert.equal(getUsdcBalance(account), 250);
});

test('detects whether the worker has the USDC trustline', () => {
  const withTrustline = accountWithBalances([
    { asset_code: 'USDC', asset_issuer: TESTNET_USDC_ISSUER, balance: '0' },
  ]);
  const withoutTrustline = accountWithBalances([
    { asset_code: 'USDC', asset_issuer: 'OTHER', balance: '0' },
  ]);

  assert.equal(hasUsdcTrustline(withTrustline), true);
  assert.equal(hasUsdcTrustline(withoutTrustline), false);
});

test('requires a worker public key before creating a disbursement', async () => {
  const originalError = console.error;
  console.error = () => {};

  try {
    await assert.rejects(
      requestWageAdvance('AdebolaBolt', '', 3, 15, {
        employerPublicKey: 'GEMPLOYER',
        employerSecretKey: 'SEMPLOYER',
        server: {
          loadAccount: async () => {
            throw new Error('server should not be called without worker key');
          },
        },
      }),
      /Worker public key is required/
    );
  } finally {
    console.error = originalError;
  }
});
