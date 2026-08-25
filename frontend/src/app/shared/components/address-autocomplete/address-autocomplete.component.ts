import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { GeorefAddressMatch, GeorefService } from '../../../core/services/georef.service';
import { DebouncedSearch } from '../../utils/debounced-search.util';

interface AddressQuery {
  term: string;
  locality: string;
}

@Component({
  selector: 'app-address-autocomplete',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './address-autocomplete.component.html',
  styleUrl: './address-autocomplete.component.scss',
})
export class AddressAutocompleteComponent implements OnChanges {
  private readonly georefService = inject(GeorefService);

  // Sin localidad confirmada, buscar la calle es peligroso (ver el
  // comentario de GeorefService.searchAddresses) -- este input queda
  // deshabilitado hasta que el padre confirme una.
  @Input() locality = '';

  // Se reenvía al <input> interno para que un <label for="..."> del
  // padre lo pueda enfocar -- sin esto el label queda apuntando a nada.
  @Input() id = '';

  @Output() readonly textChange = new EventEmitter<string>();
  @Output() readonly addressSelected = new EventEmitter<GeorefAddressMatch>();

  queryText = '';

  private readonly search = new DebouncedSearch<AddressQuery, GeorefAddressMatch>({
    debounceMs: 400,
    isEqual: (a, b) => a.term === b.term && a.locality === b.locality,
    search: (query) =>
      query.locality
        ? this.georefService.searchAddresses(query.term, query.locality)
        : of([]),
  });

  readonly results = this.search.results;
  readonly isSearching = this.search.isSearching;
  readonly isOpen = this.search.isOpen;

  // Sin esto, cambiar la localidad después de haber buscado una
  // dirección deja `results()` con coincidencias de la localidad
  // anterior, seleccionables como si fueran de la nueva.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['locality'] && !changes['locality'].firstChange) {
      this.search.reset();

      if (this.queryText.trim()) {
        this.search.search({ term: this.queryText.trim(), locality: this.locality });
      }
    }
  }

  onInput(): void {
    this.textChange.emit(this.queryText);
    this.search.search({ term: this.queryText.trim(), locality: this.locality });
  }

  // Mismo motivo que en locality-autocomplete: sin esto, Enter dispara el
  // submit nativo del form en vez de confirmar la sugerencia.
  onEnter(event: Event): void {
    event.preventDefault();

    if (!this.resultsMatchCurrentQuery()) {
      return;
    }

    const [first] = this.results();

    if (this.isOpen() && first) {
      this.select(first);
    }
  }

  // A diferencia de locality-autocomplete, acá NO se pisa queryText con
  // el label del match -- "Referencia de dirección" es texto libre del
  // usuario ("Sarmiento 850"), y el label que devuelve GeoRef puede venir
  // sin el número (ver el fallback por calle en GeorefService) o
  // repetir la localidad que ya se ve al lado. Geocodificar solo mueve
  // el pin, nunca reescribe lo que la persona escribió.
  select(match: GeorefAddressMatch): void {
    this.isOpen.set(false);
    this.addressSelected.emit(match);
  }

  onBlur(): void {
    setTimeout(() => {
      this.isOpen.set(false);

      // A diferencia de una localidad, una dirección no tiene un "nombre
      // exacto" para comparar contra lo tipeado -- pero si sólo quedó una
      // coincidencia mostrándose (y sigue correspondiendo a lo tipeado),
      // confirmarla sola es seguro.
      const results = this.results();

      if (this.resultsMatchCurrentQuery() && results.length === 1) {
        this.select(results[0]);
      }
    }, 150);
  }

  private resultsMatchCurrentQuery(): boolean {
    return this.search.matchesLastQuery(
      (last) => last.term === this.queryText.trim() && last.locality === this.locality,
    );
  }
}
