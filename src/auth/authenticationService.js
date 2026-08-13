import { getMsalConfiguration } from './msalConfig.js';
import {
  getMsalAccount,
  getMsalClient,
  initializeMsalClient,
} from './msalClient.js';

const resolveClient = (client) => client ?? getMsalClient();

export const getAuthenticatedAccount = ({ client } = {}) => {
  try {
    return getMsalAccount(resolveClient(client));
  } catch {
    return null;
  }
};

export const initializeAuthentication = async ({ client } = {}) => {
  const resolvedClient = resolveClient(client);
  await initializeMsalClient(resolvedClient);
  return getMsalAccount(resolvedClient);
};

export const login = async ({ client, loginRequest } = {}) => {
  const resolvedClient = resolveClient(client);
  const resolvedRequest = loginRequest ?? getMsalConfiguration().apiRequest;
  await initializeMsalClient(resolvedClient);
  await resolvedClient.loginRedirect(resolvedRequest);
};

export const logout = async ({ client, postLogoutRedirectUri } = {}) => {
  const resolvedClient = resolveClient(client);
  const resolvedRedirectUri = postLogoutRedirectUri
    ?? getMsalConfiguration().clientConfig.auth.postLogoutRedirectUri;
  await initializeMsalClient(resolvedClient);
  await resolvedClient.logoutRedirect({
    account: getMsalAccount(resolvedClient),
    postLogoutRedirectUri: resolvedRedirectUri,
  });
};
