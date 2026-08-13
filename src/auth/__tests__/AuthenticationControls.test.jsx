import { describe, expect, it, vi } from 'vitest';

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useEffect: vi.fn(),
    useState: (initialValue) => [
      typeof initialValue === 'function' ? initialValue() : initialValue,
      vi.fn(),
    ],
  };
});

import { AuthenticationControls } from '../AuthenticationControls.jsx';

const findElement = (node, predicate) => {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== 'object' || !node.props) return null;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
};

const textContent = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return node.props ? textContent(node.props.children) : '';
};

const createAuthenticationService = (account) => ({
  getAccount: vi.fn(() => account),
  initialize: vi.fn(async () => account),
  login: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
});

describe('controles de autenticación', () => {
  it('ofrece iniciar sesión cuando no existe una cuenta', async () => {
    const authenticationService = createAuthenticationService(null);
    const tree = AuthenticationControls({ authenticationService });
    const button = findElement(tree, (node) => node.type === 'button');

    expect(textContent(button)).toBe('Iniciar sesión');
    await button.props.onClick();
    expect(authenticationService.login).toHaveBeenCalledOnce();
  });

  it('muestra la cuenta y permite cerrar sesión', async () => {
    const authenticationService = createAuthenticationService({
      name: 'Usuario IOCA',
      username: 'user@example.com',
    });
    const tree = AuthenticationControls({ authenticationService });
    const button = findElement(tree, (node) => node.type === 'button');

    expect(textContent(tree)).toContain('Usuario IOCA');
    expect(textContent(button)).toBe('Cerrar sesión');
    await button.props.onClick();
    expect(authenticationService.logout).toHaveBeenCalledOnce();
  });
});
