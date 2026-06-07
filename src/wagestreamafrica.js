require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

// Connect to Stellar testnet
const server = new StellarSdk.Horizon.Server(process.env.HORIZON_URL);

// Register a worker and their daily wage rate
async function registerWorker(workerName, dailyRate) {
  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.SECRET_KEY);
    const sourceAccount = await server.loadAccount(process.env.PUBLIC_KEY);

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
  }
}

// Request earned wage advance
async function requestWageAdvance(workerName, daysWorked, dailyRate) {
  try {
    const sourceKeypair = StellarSdk.Keypair.fromSecret(process.env.SECRET_KEY);
    const sourceAccount = await server.loadAccount(process.env.PUBLIC_KEY);

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
  }
}

// Test it
async function main() {
  console.log('--- Registering Worker ---');
  await registerWorker('AdebolaBolt', '15');

  console.log('\n--- Requesting Wage Advance ---');
  await requestWageAdvance('AdebolaBolt', 3, 15);
}

main();