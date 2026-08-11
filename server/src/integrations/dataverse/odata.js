export const escapeODataString = (value) => String(value).replaceAll("'", "''");

export const quoteODataString = (value) => `'${escapeODataString(value)}'`;
