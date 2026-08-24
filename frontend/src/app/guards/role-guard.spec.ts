import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UrlTree } from '@angular/router';
import { Observable, firstValueFrom, isObservable } from 'rxjs';

import { roleGuard } from './role-guard';
import { AuthService } from '../core/services/auth.service';

describe('roleGuard', () => {
  let tokenValue: string | null;
  const profileLoadedSignal = signal(false);
  const actorRoleSignal = signal<string | null>(null);

  beforeEach(() => {
    tokenValue = 'un-token';
    profileLoadedSignal.set(false);
    actorRoleSignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            getToken: () => tokenValue,
            profileLoaded: profileLoadedSignal,
            actorRole: actorRoleSignal,
          },
        },
      ],
    });
  });

  async function run(allowedRoles: string[]): Promise<boolean | UrlTree> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = TestBed.runInInjectionContext(() =>
      roleGuard(allowedRoles)({} as never, {} as never),
    );

    return isObservable(result)
      ? firstValueFrom(result as Observable<boolean | UrlTree>)
      : (result as boolean | UrlTree);
  }

  it('redirige a /entrar si no hay token', async () => {
    tokenValue = null;

    const result = await run(['ong', 'comunidad']);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/entrar');
  });

  it('no resuelve hasta que el perfil termina de cargar', async () => {
    const resultPromise = run(['ong', 'comunidad']);
    let resolved = false;
    resultPromise.then(() => (resolved = true));

    await Promise.resolve();
    expect(resolved).toBe(false);

    actorRoleSignal.set('ong');
    profileLoadedSignal.set(true);

    expect(await resultPromise).toBe(true);
  });

  it('permite el paso con un rol incluido en allowedRoles', async () => {
    actorRoleSignal.set('comunidad');
    profileLoadedSignal.set(true);

    expect(await run(['ong', 'comunidad'])).toBe(true);
  });

  it('redirige a /unauthorized con un rol no incluido en allowedRoles', async () => {
    actorRoleSignal.set('moderador');
    profileLoadedSignal.set(true);

    const result = await run(['ong', 'comunidad']);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/unauthorized');
  });

  it('redirige a /unauthorized si el perfil no tiene actorRole (ej. cuenta sin organización)', async () => {
    actorRoleSignal.set(null);
    profileLoadedSignal.set(true);

    const result = await run(['ong', 'comunidad']);

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/unauthorized');
  });
});
