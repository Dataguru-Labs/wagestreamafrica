require('dotenv').config({ quiet: true });
const StellarSdk = require('@stellar/stellar-sdk');

const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';

// Connect to Stellar testnet
function getServer(horizonUrl = process.env.HORIZON_URL || DEFAULT_HORIZON_URL) {
  return new StellarSdk.Horizon.Server(horizonUrl);
}

function getConfig(options = {}) {
  return {
    horizonUrl: options.horizonUrl || process.env.HORIZON_URL || DEFAULT_HORIZON_URL,
    publicKey: options.publicKey || process.env.PUBLIC_KEY,
    secretKey: options.secretKey || process.env.SECRET_KEY,
    networkPassphrase: options.networkPassphrase || StellarSdk.Networks.TESTNET,
  };
}

function requireConfig(config) {
  const missing = [];

  if (!config.publicKey) missing.push('PUBLIC_KEY');
  if (!config.secretKey) missing.push('SECRET_KEY');

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function requireWorkerName(workerName) {
  if (typeof workerName !== 'string' || workerName.trim().length === 0) {
    throw new Error('Worker name is required');
  }
}

function requirePositiveNumber(value, label) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }

  return numberValue;
}

function calculateWageAdvance(daysWorked, dailyRate) {
  const validDaysWorked = requirePositiveNumber(daysWorked, 'Days worked');
  const validDailyRate = requirePositiveNumber(dailyRate, 'Daily rate');

  return validDaysWorked * validDailyRate;
}

// Register a worker and their daily wage rate
async function registerWorker(workerName, dailyRate, options = {}) {
  const config = getConfig(options);
  const server = options.server || getServer(config.horizonUrl);

  try {
    requireConfig(config);
    requireWorkerName(workerName);
    const validDailyRate = requirePositiveNumber(dailyRate, 'Daily rate');

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.secretKey);
    const sourceAccount = await server.loadAccount(config.publicKey);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `worker_${workerName}`,
          value: `${validDailyRate}XLM_daily`,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    console.log('✅ Worker registered successfully!');
    console.log('Worker Name:', workerName);
    console.log('Daily Rate:', validDailyRate, 'XLM');
    console.log('Transaction Hash:', result.hash);

    return result;
  } catch (error) {
    console.error('❌ Error registering worker:', error.message);
    throw error;
  }
}

// Request earned wage advance
async function requestWageAdvance(workerName, daysWorked, dailyRate, options = {}) {
  const config = getConfig(options);
  const server = options.server || getServer(config.horizonUrl);

  try {
    requireConfig(config);
    requireWorkerName(workerName);

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.secretKey);
    const sourceAccount = await server.loadAccount(config.publicKey);
    const earnedAmount = calculateWageAdvance(daysWorked, dailyRate);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `advance_${workerName}`,
          value: `${earnedAmount}XLM_${daysWorked}days`,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    console.log('✅ Wage advance recorded successfully!');
    console.log('Worker:', workerName);
    console.log('Days Worked:', daysWorked);
    console.log('Amount Earned:', earnedAmount, 'XLM');
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
  await requestWageAdvance('AdebolaBolt', 3, 15);
}

if (require.main === module) {
  main();
}

module.exports = {
  calculateWageAdvance,
  getConfig,
  getServer,
  registerWorker,
  requestWageAdvance,
};
