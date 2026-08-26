import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GeorefLocality, GeorefService } from '../../../core/services/georef.service';
import { normalizeText } from '../../utils/normalize-text.util';
import { DebouncedSearch } from '../../utils/debounced-search.util';

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

  private readonly search = new DebouncedSearch<string, GeorefLocality>({
    debounceMs: 300,
    isEqual: (a, b) => a === b,
    search: (term) => this.georefService.searchLocalities(term),
  });

  readonly results = this.search.results;
  readonly isSearching = this.search.isSearching;
  readonly isOpen = this.search.isOpen;

  // Evita que onBlur dispare una segunda búsqueda (confirmTypedLocality)
  // después de una selección explícita ya confirmada por click o Enter
  // -- esa búsqueda nunca podía matchear nada (queryText ya quedó como
  // "Nombre, Provincia") así que era puro tráfico desperdiciado en el
  // camino feliz.
  private confirmed = false;

  // confirmTypedLocality() dispara su propio subscribe() por fuera de
  // DebouncedSearch (no es una búsqueda "mientras se tipea", es la
  // confirmación puntual del blur) -- sin este contador, una respuesta
  // vieja podía pisar la localidad correcta con una vieja.
  private requestId = 0;

  onInput(): void {
    this.confirmed = false;
    this.requestId++;
    // Trimeado acá (no solo al comparar) para que el último query
    // recordado por DebouncedSearch y queryText.trim() nunca queden
    // desalineados por un espacio final -- mismo criterio que
    // address-autocomplete.component.ts.
    this.search.search(this.queryText.trim());
  }

  // Sin esto, Enter en este input dispara el submit nativo del <form> que
  // lo contiene -- el vecino escribe su localidad, aprieta Enter como en
  // cualquier campo de texto, y termina publicando la necesidad sin haber
  // llegado a elegir ninguna opción de la lista. Enter acá confirma la
  // primera coincidencia en vez de disparar el submit.
  onEnter(event: Event): void {
    event.preventDefault();

    if (!this.search.matchesLastQuery((last) => last === this.queryText.trim())) {
      return;
    }

    const [first] = this.results();

    if (!this.isOpen() || !first) {
      return;
    }

    // Mismo criterio que autoSelectExactMatch: si la primera sugerencia
    // tiene un homónimo en otra provincia (ej. "La Falda" existe en
    // Córdoba y en San Juan, sin que GeoRef las ordene por relevancia
    // local), preferimos el de Córdoba en vez de lo que el orden de la
    // API haya puesto primero -- sin tocar cuál es "la primera sugerencia"
    // cuando no hay ambigüedad real.
    const homonyms = this.results().filter(
      (l) => normalizeText(l.nombre) === normalizeText(first.nombre),
    );
    const match = homonyms.find((l) => l.provincia.nombre === 'Córdoba') ?? first;

    this.select(match);
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

    const requestId = ++this.requestId;

    this.georefService.searchLocalities(typed).subscribe({
      next: (localities) => {
        if (requestId !== this.requestId) {
          // El usuario ya volvió a tipear (u otro blur disparó una
          // confirmación más nueva) antes de que llegara esta respuesta --
          // aplicarla ahora pisaría con algo viejo lo que se ve en pantalla.
          return;
        }
        this.autoSelectExactMatch(typed, localities);
      },
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
    // ante una coincidencia exacta ambigua preferimos la de Córdoba. Si
    // NINGUNA de varias coincidencias es de Córdoba, no adivinamos cuál
    // -- mismo criterio que georef.service.ts::geocodeLocality ("más
    // seguro no matchear que confirmar la provincia equivocada"). Con una
    // sola coincidencia (sin ambigüedad real) se confirma igual, sea cual
    // sea la provincia.
    const cordobaMatch = exactMatches.find((l) => l.provincia.nombre === 'Córdoba');
    const match = cordobaMatch ?? (exactMatches.length === 1 ? exactMatches[0] : undefined);

    if (match) {
      this.select(match);
    }
  }
}
