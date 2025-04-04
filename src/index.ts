import express from 'express';
import dotenv from 'dotenv';
import { loadAndIndexData } from './utils/embedding';

import {
  CloudAdapter,
  ConfigurationServiceClientCredentialFactory,
  ConfigurationBotFrameworkAuthentication,
  MemoryStorage,
  ConversationState,
  UserState
} from 'botbuilder';

import { ProductDialog } from './dialogs/productDialog';

dotenv.config();
const app = express();
const port = process.env.PORT || 3978;
app.use(express.json()); // Add this to ensure JSON parsing

const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.BOT_AUTH_DISABLED === "true" ? "" : process.env.BOT_ID,
  MicrosoftAppPassword: process.env.BOT_AUTH_DISABLED === "true" ? "" : process.env.BOT_PASSWORD,
  MicrosoftAppType: "MultiTenant",
});

const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication({}, credentialsFactory);
const adapter = new CloudAdapter(botFrameworkAuth);

// Error handler
adapter.onTurnError = async (context, error) => {
  console.error(`[onTurnError] ${error}`);
  await context.sendActivity("The bot encountered an error or bug.");
};

const memoryStorage = new MemoryStorage();
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);
// Main dialog
const productDialog = new ProductDialog(conversationState);


async function startServer() {
  try {
    if (process.env.INDEX_REFRESH_ENABLED === "true") {
      console.log("📦 Loading and indexing data...");
      await loadAndIndexData(); // ✅ WAIT for it!
      console.log("✅ Data loaded and indexed");
    }
   

    // Create HTTP server
    app.listen(port, () => {
      console.log(`✅ Bot is listening on http://localhost:${port}/api/messages`);
    });


  } catch (err: any) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}

startServer();

// Route incoming requests to bot
app.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await productDialog.run(context);
  });
});

// Health check
app.get('/ping', (req, res) => {
  res.send('pong 🏓');
});
