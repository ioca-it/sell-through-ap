import { PublicClientApplication } from '@azure/msal-browser';
import { getMsalConfiguration } from './msalConfig.js';

let defaultClient;
const initializationByClient = new WeakMap();

export const createMsalClient = (clientConfig) => (
  new PublicClientApplication(clientConfig)
);

export const getMsalClient = () => {
  if (!defaultClient) {
    defaultClient = createMsalClient(getMsalConfiguration().clientConfig);
  }
  return defaultClient;
};

export const initializeMsalClient = async (client = getMsalClient()) => {
  if (!initializationByClient.has(client)) {
    initializationByClient.set(client, (async () => {
      await client.initialize();
      const redirectResult = await client.handleRedirectPromise();
      if (redirectResult?.account) client.setActiveAccount(redirectResult.account);
      return redirectResult;
    })());
  }

  return initializationByClient.get(client);
};

export const getMsalAccount = (client = getMsalClient()) => {
  const account = client.getActiveAccount() ?? client.getAllAccounts()[0] ?? null;
  if (account && client.getActiveAccount() !== account) client.setActiveAccount(account);
  return account;
};
