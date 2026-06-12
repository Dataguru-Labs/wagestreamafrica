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

function requirePositiveNumber(value, label) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }

  return numberValue;
}

function normalizeWorker(worker, index) {
  if (!worker || typeof worker !== 'object') {
    throw new Error(`Registered worker at index ${index} is invalid`);
  }

  const name = String(worker.name || worker.workerName || '').trim();
  const dailyRate = requirePositiveNumber(worker.dailyRate, `Worker ${index + 1} daily rate`);

  if (!name) {
    throw new Error(`Worker ${index + 1} name is required`);
  }

  return {
    name,
    dailyRate,
  };
}

function calculateRequiredFloat(registeredWorkers = []) {
  if (!Array.isArray(registeredWorkers) || registeredWorkers.length === 0) {
    throw new Error('At least one registered worker is required');
  }

  return registeredWorkers
    .map(normalizeWorker)
    .reduce((total, worker) => total + worker.dailyRate, 0);
}

// Register a worker and their daily wage rate
async function registerWorker(workerName, dailyRate, options = {}) {
  const config = getConfig(options);
  const server = options.server || getServer(config.horizonUrl);

  try {
    requireConfig(config);

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.secretKey);
    const sourceAccount = await server.loadAccount(config.publicKey);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `worker_${workerName}`,
          value: `${dailyRate}XLM_daily`,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    console.log('✅ Worker registered successfully!');
    console.log('Worker Name:', workerName);
    console.log('Daily Rate:', dailyRate, 'XLM');
    console.log('Transaction Hash:', result.hash);

    return result;
  } catch (error) {
    console.error('❌ Error registering worker:', error.message);
    throw error;
  }
}

// Deposit employer salary float for registered workers
async function depositFloat(employerName, depositAmount, registeredWorkers, options = {}) {
  const config = getConfig(options);
  const server = options.server || getServer(config.horizonUrl);

  try {
    requireConfig(config);

    const normalizedEmployerName = String(employerName || '').trim();
    const validDepositAmount = requirePositiveNumber(depositAmount, 'Deposit amount');
    const requiredFloat = calculateRequiredFloat(registeredWorkers);

    if (!normalizedEmployerName) {
      throw new Error('Employer name is required');
    }

    if (validDepositAmount < requiredFloat) {
      throw new Error(
        `Deposit amount ${validDepositAmount} is below required worker float ${requiredFloat}`
      );
    }

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.secretKey);
    const sourceAccount = await server.loadAccount(config.publicKey);

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.manageData({
          name: `float_${normalizedEmployerName}`,
          value: `${validDepositAmount}XLM_${registeredWorkers.length}workers`,
        })
      )
      .setTimeout(30)
      .build();

    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);

    const confirmation = {
      employerName: normalizedEmployerName,
      depositAmount: validDepositAmount,
      requiredFloat,
      workerCount: registeredWorkers.length,
      transactionHash: result.hash,
    };

    console.log('✅ Employer salary float deposited successfully!');
    console.log('Employer:', confirmation.employerName);
    console.log('Deposit Amount:', confirmation.depositAmount, 'XLM');
    console.log('Required Worker Float:', confirmation.requiredFloat, 'XLM');
    console.log('Transaction Hash:', confirmation.transactionHash);

    return {
      ...result,
      confirmation,
    };
  } catch (error) {
    console.error('❌ Error depositing salary float:', error.message);
    throw error;
  }
}

// Request earned wage advance
async function requestWageAdvance(workerName, daysWorked, dailyRate, options = {}) {
  const config = getConfig(options);
  const server = options.server || getServer(config.horizonUrl);

  try {
    requireConfig(config);

    const sourceKeypair = StellarSdk.Keypair.fromSecret(config.secretKey);
    const sourceAccount = await server.loadAccount(config.publicKey);

    const earnedAmount = daysWorked * dailyRate;

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
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

  console.log('\n--- Depositing Employer Float ---');
  await depositFloat('LagosFleet', 45, [
    { name: 'AdebolaBolt', dailyRate: 15 },
    { name: 'KemiDispatch', dailyRate: 20 },
  ]);

  console.log('\n--- Requesting Wage Advance ---');
  await requestWageAdvance('AdebolaBolt', 3, 15);
}

if (require.main === module) {
  main();
}

module.exports = {
  calculateRequiredFloat,
  depositFloat,
  getConfig,
  getServer,
  registerWorker,
  requestWageAdvance,
};
