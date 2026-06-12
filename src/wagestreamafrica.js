require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';
const TESTNET_USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

function getConfig() {
  return {
    horizonUrl: process.env.HORIZON_URL || DEFAULT_HORIZON_URL,
    networkPassphrase:
      process.env.STELLAR_NETWORK === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET,
    employerPublicKey: process.env.PUBLIC_KEY,
    employerSecretKey: process.env.SECRET_KEY,
    workerPublicKey: process.env.WORKER_PUBLIC_KEY,
    usdcIssuer: process.env.USDC_ISSUER || TESTNET_USDC_ISSUER,
  };
}

function getServer(horizonUrl = getConfig().horizonUrl) {
  return new StellarSdk.Horizon.Server(horizonUrl);
}

function getUsdcAsset(usdcIssuer = getConfig().usdcIssuer) {
  return new StellarSdk.Asset('USDC', usdcIssuer);
}

function formatStellarAmount(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  return numericAmount.toFixed(7).replace(/\.?0+$/, '');
}

function getUsdcBalance(account, usdcIssuer = getConfig().usdcIssuer) {
  const balanceLine = account.balances.find((balance) => {
    return (
      balance.asset_code === 'USDC' &&
      balance.asset_issuer === usdcIssuer
    );
  });

  return balanceLine ? Number(balanceLine.balance) : 0;
}

function hasUsdcTrustline(account, usdcIssuer = getConfig().usdcIssuer) {
  return account.balances.some((balance) => {
    return (
      balance.asset_code === 'USDC' &&
      balance.asset_issuer === usdcIssuer
    );
  });
}

function requireEnv(config) {
  const missing = [];

  if (!config.employerPublicKey) missing.push('PUBLIC_KEY');
  if (!config.employerSecretKey) missing.push('SECRET_KEY');

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Register a worker and their daily wage rate
async function registerWorker(workerName, dailyRate, options = {}) {
  const config = { ...getConfig(), ...options };
  const server = options.server || getServer(config.horizonUrl);

  try {
    requireEnv(config);

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.employerSecretKey);
    const sourceAccount = await server.loadAccount(config.employerPublicKey);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `worker_${workerName}`,
          value: `${formatStellarAmount(dailyRate)}USDC_daily`,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    console.log('✅ Worker registered successfully!');
    console.log('Worker Name:', workerName);
    console.log('Daily Rate:', formatStellarAmount(dailyRate), 'USDC');
    console.log('Transaction Hash:', result.hash);

    return result;
  } catch (error) {
    console.error('❌ Error registering worker:', error.message);
    throw error;
  }
}

// Request earned wage advance
async function requestWageAdvance(workerName, workerPublicKey, daysWorked, dailyRate, options = {}) {
  const config = { ...getConfig(), ...options };
  const server = options.server || getServer(config.horizonUrl);
  const usdcAsset = getUsdcAsset(config.usdcIssuer);

  try {
    requireEnv(config);

    if (!workerPublicKey) {
      throw new Error('Worker public key is required for USDC disbursement');
    }

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.employerSecretKey);
    const sourceAccount = await server.loadAccount(config.employerPublicKey);
    const workerAccount = await server.loadAccount(workerPublicKey);

    const earnedAmount = daysWorked * dailyRate;
    const paymentAmount = formatStellarAmount(earnedAmount);
    const employerUsdcBalance = getUsdcBalance(sourceAccount, config.usdcIssuer);

    if (!hasUsdcTrustline(workerAccount, config.usdcIssuer)) {
      throw new Error('Worker account must establish a USDC trustline before disbursement');
    }

    if (employerUsdcBalance < Number(paymentAmount)) {
      throw new Error(
        `Insufficient employer USDC float: ${employerUsdcBalance} available, ${paymentAmount} required`
      );
    }

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: workerPublicKey,
          asset: usdcAsset,
          amount: paymentAmount,
        })
      )
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `advance_${workerName}`,
          value: `${paymentAmount}USDC_${daysWorked}days`,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    console.log('✅ Wage advance recorded successfully!');
    console.log('Worker:', workerName);
    console.log('Days Worked:', daysWorked);
    console.log('Amount Disbursed:', paymentAmount, 'USDC');
    console.log('Transaction Hash:', result.hash);

    return result;
  } catch (error) {
    console.error('❌ Error requesting wage advance:', error.message);
    throw error;
  }
}

// Test it
async function main() {
  console.log('--- Registering Worker ---');
  await registerWorker('AdebolaBolt', '15');

  console.log('\n--- Requesting Wage Advance ---');
  await requestWageAdvance('AdebolaBolt', process.env.WORKER_PUBLIC_KEY, 3, 15);
}

if (require.main === module) {
  main();
}

module.exports = {
  TESTNET_USDC_ISSUER,
  formatStellarAmount,
  getUsdcAsset,
  getUsdcBalance,
  hasUsdcTrustline,
  registerWorker,
  requestWageAdvance,
};
