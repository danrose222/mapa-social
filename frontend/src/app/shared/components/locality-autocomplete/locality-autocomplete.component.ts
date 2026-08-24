import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { GeorefLocality, GeorefService } from '../../../core/services/georef.service';
import { normalizeText } from '../../utils/normalize-text.util';

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
export class LocalityAutocompleteComponent implements OnInit {
  private readonly georefService = inject(GeorefService);

  // Se reenvía al <input> interno para que un <label for="..."> del
  // padre lo pueda enfocar -- sin esto el label queda apuntando a nada.
  @Input() id = '';

  // Para cuando el padre ya conoce una localidad de partida (ej: la
  // búsqueda actual del mapa, o la geolocalización) -- precarga el texto
  // sin forzar a retipearla, pero sigue siendo editable/buscable como
  // cualquier otro valor.
  @Input() initialValue = '';

  @Output() readonly localitySelected = new EventEmitter<LocalitySelection>();

  queryText = '';

  ngOnInit(): void {
    if (this.initialValue) {
      this.queryText = this.initialValue;
    }
  }
  readonly results = signal<GeorefLocality[]>([]);
  readonly isSearching = signal(false);
  readonly isOpen = signal(false);

  // Qué término produjo los `results()` actuales -- onEnter no debe
  // confirmar una coincidencia que en realidad quedó de una búsqueda
  // anterior porque el usuario reescribió el campo y todavía no llegó
  // la respuesta debounced de la búsqueda nueva.
  private resultsForTerm = '';

  // Evita que onBlur dispare una segunda búsqueda (confirmTypedLocality)
  // después de una selección explícita ya confirmada por click o Enter
  // -- esa búsqueda nunca podía matchear nada (queryText ya quedó como
  // "Nombre, Provincia") así que era puro tráfico desperdiciado en el
  // camino feliz.
  private confirmed = false;

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
            map((localities) => ({ term, localities })),
            catchError(() => {
              this.isSearching.set(false);
              return of({ term, localities: [] as GeorefLocality[] });
            }),
          );
        }),
      )
      .subscribe({
        next: ({ term, localities }) => {
          this.isSearching.set(false);
          this.resultsForTerm = term;
          this.results.set(localities);
          this.isOpen.set(localities.length > 0);
        },
      });
  }

  onInput(): void {
    this.confirmed = false;
    this.queryChanges.next(this.queryText);
  }

  // Sin esto, Enter en este input dispara el submit nativo del <form> que
  // lo contiene -- el vecino escribe su localidad, aprieta Enter como en
  // cualquier campo de texto, y termina publicando la necesidad sin haber
  // llegado a elegir ninguna opción de la lista. Enter acá confirma la
  // primera coincidencia en vez de disparar el submit.
  onEnter(event: Event): void {
    event.preventDefault();

    if (this.resultsForTerm !== this.queryText.trim()) {
      return;
    }

    const [first] = this.results();

    if (this.isOpen() && first) {
      this.select(first);
    }
  }

  select(locality: GeorefLocality): void {
    this.queryText = `${locality.nombre}, ${locality.provincia.nombre}`;
    this.confirmed = true;
    this.isOpen.set(false);
    this.localitySelected.emit({
      locality: locality.nombre,
      provincia: locality.provincia.nombre,
    });
  }

  onBlur(): void {
    // Delay para que el click sobre una opción de la lista alcance a
    // dispararse antes de que el blur la cierre.
    setTimeout(() => {
      this.isOpen.set(false);
      this.confirmTypedLocality();
    }, 150);
  }

  // Red de seguridad para cuando el usuario escribe la localidad completa
  // y simplemente pasa al siguiente campo (tab, click, o cierra el
  // teclado en el celular) sin clickear una opción ni apretar Enter --
  // en la práctica, la forma más común de "completar" un input. Sin
  // esto, la localidad tipeada se pierde en silencio.
  private confirmTypedLocality(): void {
    if (this.confirmed) {
      return;
    }

    const typed = this.queryText.trim();

    if (!typed) {
      return;
    }

    this.georefService.searchLocalities(typed).subscribe({
      next: (localities) => this.autoSelectExactMatch(typed, localities),
      error: () => {},
    });
  }

  private autoSelectExactMatch(typed: string, localities: GeorefLocality[]): void {
    const term = normalizeText(typed);
    const exactMatches = localities.filter((l) => normalizeText(l.nombre) === term);

    if (exactMatches.length === 0) {
      return;
    }

    // Nombres de localidad se repiten entre provincias (ej: "La Falda"
    // existe en Córdoba y en San Juan, y GeoRef no las ordena por
    // relevancia local) -- esta app es de alcance provincial, así que
    // ante una coincidencia exacta ambigua preferimos la de Córdoba en
    // vez de la que el orden de la API ponga primero.
    const match = exactMatches.find((l) => l.provincia.nombre === 'Córdoba') ?? exactMatches[0];

    this.select(match);
  }
}
