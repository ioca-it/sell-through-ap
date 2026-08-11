// Punto único para integrar MSAL posteriormente sin acoplar UI, Repository o
// Customer Master Service al SDK de identidad.
export const getAccessToken = async () => {
  throw new Error('Customer API authentication is not configured.');
};
