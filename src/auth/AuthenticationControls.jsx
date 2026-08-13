import React, { useEffect, useState } from 'react';
import {
  getAuthenticatedAccount,
  initializeAuthentication,
  login,
  logout,
} from './authenticationService.js';

const defaultAuthenticationService = Object.freeze({
  getAccount: getAuthenticatedAccount,
  initialize: initializeAuthentication,
  login,
  logout,
});

export const AuthenticationControls = ({
  authenticationService = defaultAuthenticationService,
} = {}) => {
  const [account, setAccount] = useState(() => authenticationService.getAccount());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    authenticationService.initialize()
      .then((authenticatedAccount) => {
        if (mounted) setAccount(authenticatedAccount);
      })
      .catch(() => {
        if (mounted) setMessage('Autenticación no disponible.');
      });
    return () => {
      mounted = false;
    };
  }, [authenticationService]);

  const execute = async (action) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch {
      setMessage('No fue posible completar la autenticación.');
      setBusy(false);
    }
  };

  const accountLabel = account?.name || account?.username;

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      {account ? (
        <>
          <div className="opacity-80" aria-label="Cuenta autenticada">
            {accountLabel || 'Cuenta autenticada'}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => execute(() => authenticationService.logout())}
            className="px-3 py-1 border disabled:opacity-50"
            style={{ borderColor: '#d4af37', color: '#d4af37' }}
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => execute(() => authenticationService.login())}
          className="px-3 py-1.5 border font-bold disabled:opacity-50"
          style={{ borderColor: '#d4af37', color: '#d4af37' }}
        >
          Iniciar sesión
        </button>
      )}
      {message && <div className="opacity-70" role="status">{message}</div>}
    </div>
  );
};
