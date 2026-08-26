import { signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

export interface DebouncedSearchOptions<Q, R> {
  debounceMs: number;
  isEqual: (a: Q, b: Q) => boolean;
  search: (query: Q) => Observable<R[]>;
}

// locality-autocomplete y address-autocomplete necesitaban, cada uno por
// su cuenta, el mismo esqueleto: debounce + cancelar la búsqueda anterior
// si llega una más nueva (switchMap) + no matar la suscripción para
// siempre si Georef tira un error (catchError ADENTRO del switchMap, no
// afuera) + isSearching/isOpen/results como estado derivado. Lo que cada
// autocomplete SÍ sigue resolviendo por su cuenta es qué hacer con un
// resultado (preferir Córdoba ante un homónimo, confirmar solo o no,
// reescribir el campo o no) -- eso es negocio de cada uno, no de esta
// clase.
export class DebouncedSearch<Q, R> {
  readonly results = signal<R[]>([]);
  readonly isSearching = signal(false);
  readonly isOpen = signal(false);

  private lastQuery: Q | null = null;
  private readonly queryChanges = new Subject<Q>();

  constructor(options: DebouncedSearchOptions<Q, R>) {
    this.queryChanges
      .pipe(
        debounceTime(options.debounceMs),
        distinctUntilChanged(options.isEqual),
        switchMap((query) => {
          this.isSearching.set(true);

          return options.search(query).pipe(
            map((items) => ({ query, items })),
            catchError(() => {
              this.isSearching.set(false);
              return of({ query, items: [] as R[] });
            }),
          );
        }),
        // Construida siempre como field initializer de un componente (o
        // dentro del constructor de uno), así que hay contexto de
        // inyección activo para resolver el DestroyRef acá adentro --
        // sin esto, salir del componente con una búsqueda en vuelo dejaba
        // el timer/la suscripción vivos.
        takeUntilDestroyed(),
      )
      .subscribe(({ query, items }) => {
        this.isSearching.set(false);
        this.lastQuery = query;
        this.results.set(items);
        this.isOpen.set(items.length > 0);
      });
  }

  search(query: Q): void {
    this.queryChanges.next(query);
  }

  // Para el guard de "¿estos resultados siguen correspondiendo a lo que
  // hay en pantalla ahora?" que onEnter/onBlur necesitan antes de
  // confirmar algo -- cada autocomplete arma su propio predicado porque
  // la forma de la query (un string, o {term, locality}) es distinta.
  matchesLastQuery(predicate: (last: Q) => boolean): boolean {
    return this.lastQuery !== null && predicate(this.lastQuery);
  }

  reset(): void {
    this.results.set([]);
    this.isOpen.set(false);
    this.lastQuery = null;
  }
}
