import { config } from 'dotenv';
import path from 'path';
import { Agent, setGlobalDispatcher } from 'undici';

// Fix WSL2/Node 24 IPv6 fetch bug by forcing IPv4
const dispatcher = new Agent({
  connect: {
    autoSelectFamily: false,
    autoSelectFamilyAttemptTimeout: 500,
  },
});
setGlobalDispatcher(dispatcher);

// Load .env from the root
config({ path: path.resolve(process.cwd(), '.env') });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Sends a notification to your iPhone via Telegram.
 */
export async function notify(message: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) {
    throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in .env');
  }

  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `🤖 Factory Update:\n\n${message}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API Error: ${error}`);
  }
}

// CLI Logic for testing
if (process.argv.includes('--test')) {
  const testMsg = process.argv[process.argv.indexOf('--test') + 1] || 'Test connection successful.';
  notify(testMsg)
    .then(() => console.log('✅ Supervisor Online: Check your iPhone.'))
    .catch((err) => console.error('❌ Supervisor Offline:', err.message));
}
