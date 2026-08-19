import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { GeorefLocality, GeorefService } from '../../../core/services/georef.service';

export interface LocalitySelection {
  locality: string;
  provincia: string;
}

@Component({
  selector: 'app-locality-autocomplete',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './locality-autocomplete.component.html',
  styleUrl: './locality-autocomplete.component.scss',
})
export class LocalityAutocompleteComponent {
  private readonly georefService = inject(GeorefService);

  @Output() readonly localitySelected = new EventEmitter<LocalitySelection>();

  queryText = '';
  readonly results = signal<GeorefLocality[]>([]);
  readonly isSearching = signal(false);
  readonly isOpen = signal(false);

  private readonly queryChanges = new Subject<string>();

  constructor() {
    this.queryChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          this.isSearching.set(true);
          // catchError ACÁ (adentro del switchMap), no en el .subscribe()
          // de afuera: un error del lado de Georef en la fuente interna
          // corta para siempre la suscripción externa completa -- sin
          // esto, el primer error de red mataba el autocomplete para el
          // resto de la vida de este componente, sin ninguna forma de
          // recuperarse salvo recargar la página.
          return this.georefService.searchLocalities(term).pipe(
            catchError(() => {
              this.isSearching.set(false);
              return of<GeorefLocality[]>([]);
            }),
          );
        }),
      )
      .subscribe({
        next: (localities) => {
          this.isSearching.set(false);
          this.results.set(localities);
          this.isOpen.set(localities.length > 0);
        },
      });
  }

  onInput(): void {
    this.queryChanges.next(this.queryText);
  }

  select(locality: GeorefLocality): void {
    this.queryText = `${locality.nombre}, ${locality.provincia.nombre}`;
    this.isOpen.set(false);
    this.localitySelected.emit({
      locality: locality.nombre,
      provincia: locality.provincia.nombre,
    });
  }

  onBlur(): void {
    // Delay para que el click sobre una opción de la lista alcance a
    // dispararse antes de que el blur la cierre.
    setTimeout(() => this.isOpen.set(false), 150);
  }
}
