import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { getMsalConfiguration } from './msalConfig.js';
import {
  getMsalAccount,
  getMsalClient,
  initializeMsalClient,
} from './msalClient.js';

const INTERACTION_ERROR_CODES = new Set([
  'consent_required',
  'interaction_required',
  'login_required',
]);

const requiresInteraction = (error) => (
  error instanceof InteractionRequiredAuthError
  || INTERACTION_ERROR_CODES.has(error?.errorCode)
);

export const acquireCustomerApiAccessToken = async ({
  client,
  tokenRequest,
} = {}) => {
  const resolvedClient = client ?? getMsalClient();
  const resolvedRequest = tokenRequest ?? getMsalConfiguration().apiRequest;
  await initializeMsalClient(resolvedClient);

  const account = getMsalAccount(resolvedClient);
  if (!account) {
    await resolvedClient.loginRedirect(resolvedRequest);
    return null;
  }

  try {
    const response = await resolvedClient.acquireTokenSilent({
      ...resolvedRequest,
      account,
    });
    if (typeof response?.accessToken !== 'string' || response.accessToken.trim() === '') {
      throw new Error('MSAL no devolvió un access token válido.');
    }
    return response.accessToken;
  } catch (error) {
    if (!requiresInteraction(error)) throw error;
    await resolvedClient.loginRedirect(resolvedRequest);
    return null;
  }
};

// Punto único consumido por el Provider; UI, Repository y Customer Master
// Service permanecen desacoplados del SDK de identidad.
export const getAccessToken = () => acquireCustomerApiAccessToken();
