import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { AuthService } from '../../core/services/auth.service';
import { CategoriesService } from '../../core/services/categories.service';
import { GeorefService } from '../../core/services/georef.service';
import { NeedLocality, PublicationsService } from '../../core/services/publications.service';
import { Category, Need, Resource } from '../../core/models/mapa-social.model';
import { IconComponent } from '../../shared/icons/icon.component';

type FilterKind = 'todos' | 'necesidades' | 'recursos';
type SearchMode = 'all' | 'locality' | 'radius';

const TERRITORY_PAGE_SIZE = 10;
const RADIUS_KM = 100;
const DEFAULT_CENTER: [number, number] = [-31.4201, -64.1888];

// Si el mapa se movió más de esto desde el último punto buscado, aparece
// el botón de "Buscar en esta zona".
const MOVE_THRESHOLD_KM = 5;

@Component({
  selector: 'app-mapa-home',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './mapa-home.component.html',
  styleUrl: './mapa-home.component.scss',
})
export class MapaHomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  private readonly authService = inject(AuthService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly georefService = inject(GeorefService);
  private readonly publicationsService = inject(PublicationsService);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);

  readonly kindFilter = signal<FilterKind>('todos');
  readonly categoryFilter = signal<Set<number>>(new Set());
  readonly searchTerm = signal('');

  // 'all' = sin acotar (default si no hay geolocalización ni ciudad).
  // 'locality' = un barrio elegido a mano en el selector (match exacto).
  // 'radius' = por cercanía a un punto (geolocalización, ciudad de perfil,
  // o "buscar en esta zona") -- siempre RADIUS_KM.
  readonly searchMode = signal<SearchMode>('all');
  readonly radiusCenter = signal<{ lat: number; lng: number } | null>(null);
  readonly radiusOrigin = signal<'geolocation' | 'ciudad' | 'manual' | null>(null);
  readonly showSearchAreaButton = signal(false);

  readonly territories = signal<NeedLocality[]>([]);
  readonly territoryFilter = signal<string | null>(null);
  readonly territoryPage = signal(1);
  readonly territoryTotalPages = signal(1);
  readonly territoryTotal = signal(0);
  readonly territoryLoading = signal(false);

  // Signals (no campos planos): visibleCount y los filtrados dependen de
  // estos dos, y sin ser signals Angular no detecta cuándo llegan los
  // datos async -- el contador de "puntos visibles" quedaba pegado en el
  // último valor calculado hasta que el usuario tocaba un filtro.
  private readonly allNeeds = signal<Need[]>([]);
  private readonly allResources = signal<Resource[]>([]);

  private staticDataLoaded = false;
  private needsDataLoaded = false;

  // Último punto contra el que se buscó -- referencia para decidir si
  // mostrar el botón de "Buscar en esta zona" cuando el mapa se mueve.
  private lastSearchedCenter: { lat: number; lng: number } = {
    lat: DEFAULT_CENTER[0],
    lng: DEFAULT_CENTER[1],
  };

  readonly visibleCount = computed(() => {
    const kind = this.kindFilter();
    const needs = kind === 'recursos' ? 0 : this.filteredNeeds().length;
    const resources = kind === 'necesidades' ? 0 : this.filteredResources().length;

    return needs + resources;
  });

  private filteredNeeds(): Need[] {
    return this.applyFilters(this.allNeeds());
  }

  private filteredResources(): Resource[] {
    return this.applyFilters(this.allResources());
  }

  private applyFilters<
    T extends {
      categoryId: number;
      title: string;
      description: string;
    },
  >(items: T[]): T[] {
    const categories = this.categoryFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory =
        categories.size === 0 || categories.has(item.categoryId);

      const matchesTerm =
        term === '' ||
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);

      return matchesCategory && matchesTerm;
    });
  }

  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  // Marcador independiente para la ubicación actual del usuario.
  // No forma parte de markersLayer para que no desaparezca al cambiar filtros.
  private userLocationMarker?: L.CircleMarker;

  // Colores pensados para las categorías del seed. Cualquier categoría nueva
  // que agregue un moderador y no esté acá cae en el fallback determinístico
  // de abajo — nunca se rompe, solo elige un color estable por nombre.
  private readonly categoryColors: Record<string, string> = {
    general: '#6b7280',
    alimentos: '#d98c1f',
    salud: '#c0392b',
    ropa: '#7a5fb0',
    vivienda: '#2b6e82',
    'educación': '#4a5fc1',
    educacion: '#4a5fc1',
    otros: '#6b7280',
  };

  private readonly fallbackPalette = [
    '#2f9e6b',
    '#d98c1f',
    '#c0392b',
    '#7a5fb0',
    '#2b6e82',
    '#4a5fc1',
    '#b5533c',
    '#1f8a8a',
  ];

  categoryColor(categoryId: number): string {
    const name =
      this.categories().find((c) => c.id === categoryId)?.name ?? '';

    const key = name.trim().toLowerCase();

    if (this.categoryColors[key]) {
      return this.categoryColors[key];
    }

    let hash = 0;

    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }

    return this.fallbackPalette[
      Math.abs(hash) % this.fallbackPalette.length
    ];
  }

  // Necesidad = corazón. Recurso = mano en alto. El color siempre es el
  // mismo por tipo (viene de --need-color / --help-color); no varía por
  // categoría — eso ahora solo distingue a los chips de filtro.
  private readonly NEED_PIN_COLOR = '#e65f32';
  private readonly RESOURCE_PIN_COLOR = '#2f83a8';

  private buildNeedIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0Z"
            fill="${this.NEED_PIN_COLOR}" stroke="#fff" stroke-width="2"/>
          <path d="M15 21c-5.4-3.7-9.4-6.7-9.4-10.7a4.3 4.3 0 0 1 8-2.7 4.3 4.3 0 0 1 8 2.7c0 4-4 7-9.4 10.7Z"
            fill="#fff"/>
        </svg>`,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -36],
    });
  }

  private buildResourceIcon(): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `
        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0Z"
            fill="${this.RESOURCE_PIN_COLOR}" stroke="#fff" stroke-width="2"/>
          <rect x="11.3" y="16" width="7.4" height="8.4" rx="2" fill="#fff"/>
          <rect x="11.4" y="8" width="1.6" height="8.6" rx="0.8" fill="#fff"/>
          <rect x="13.4" y="6.2" width="1.6" height="10.4" rx="0.8" fill="#fff"/>
          <rect x="15.4" y="6.2" width="1.6" height="10.4" rx="0.8" fill="#fff"/>
          <rect x="17.4" y="8" width="1.6" height="8.6" rx="0.8" fill="#fff"/>
          <rect x="8.2" y="15.3" width="1.6" height="6" rx="0.8" fill="#fff" transform="rotate(-32 9 18.3)"/>
        </svg>`,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -36],
    });
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    this.loadStaticData();
    this.attemptSmartInitialLoad();
  }

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: DEFAULT_CENTER,
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    this.map.on('moveend', () => this.onMapMoved());

    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  // Categorías, recursos y el listado de localidades no dependen del modo
  // de búsqueda de necesidades -- se cargan siempre, una sola vez.
  private loadStaticData(): void {
    Promise.all([
      this.categoriesService.getAll().toPromise(),
      this.publicationsService.getResources().toPromise(),
    ])
      .then(([categories, resources]) => {
        this.categories.set(categories ?? []);

        this.allResources.set(
          (resources ?? []).filter(
            (resource) => resource.status === 'available',
          ),
        );

        this.staticDataLoaded = true;
        this.checkFullyLoaded();
        this.renderMarkers();
      })
      .catch(() => {
        this.loadError.set(true);
        this.staticDataLoaded = true;
        this.checkFullyLoaded();
      });

    this.publicationsService.getNeedLocalities().subscribe({
      next: (list) => this.territories.set(list),
      error: () => {},
    });
  }

  private checkFullyLoaded(): void {
    if (this.staticDataLoaded && this.needsDataLoaded) {
      this.isLoading.set(false);
    }
  }

  // Al entrar: 1) pide geolocalización al navegador: si la da, busca en
  // 100km a la redonda tuyo, ahí mismo. 2) si no la da (o no la tenés
  // habilitada), y estás logueado con una ciudad cargada en el perfil, la
  // geocodifica contra Georef y busca ahí. 3) si no hay ninguna de las
  // dos, muestra todo sin acotar -- como era antes.
  private attemptSmartInitialLoad(): void {
    if (!navigator.geolocation) {
      this.fallbackToCityOrAll();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.startRadiusSearch(
          position.coords.latitude,
          position.coords.longitude,
          true,
          'geolocation',
        );
      },
      () => this.fallbackToCityOrAll(),
      {
        timeout: 6000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }

  private fallbackToCityOrAll(): void {
    const ciudad = this.authService.profile()?.ciudad;

    if (!ciudad) {
      this.loadAllDefault();
      return;
    }

    this.georefService.geocodeLocality(ciudad).subscribe({
      next: (point) => {
        if (point) {
          this.startRadiusSearch(
            point.lat,
            point.lng,
            true,
            'ciudad',
          );
        } else {
          this.loadAllDefault();
        }
      },
      error: () => this.loadAllDefault(),
    });
  }

  private loadAllDefault(): void {
    this.searchMode.set('all');
    this.territoryFilter.set(null);
    this.radiusCenter.set(null);

    this.lastSearchedCenter = {
      lat: DEFAULT_CENTER[0],
      lng: DEFAULT_CENTER[1],
    };

    this.showSearchAreaButton.set(false);

    this.publicationsService
      .getNeeds()
      .toPromise()
      .then((needs) => {
        this.allNeeds.set(
          (needs ?? []).filter(
            (need) => need.status === 'active',
          ),
        );

        this.needsDataLoaded = true;
        this.checkFullyLoaded();
        this.renderMarkers();
      })
      .catch(() => {
        this.loadError.set(true);
        this.needsDataLoaded = true;
        this.checkFullyLoaded();
      });
  }

  private startRadiusSearch(
    lat: number,
    lng: number,
    recenterMap: boolean,
    origin: 'geolocation' | 'ciudad' | 'manual',
  ): void {
    this.searchMode.set('radius');
    this.territoryFilter.set(null);
    this.radiusCenter.set({ lat, lng });
    this.radiusOrigin.set(origin);
    this.territoryPage.set(1);
    this.lastSearchedCenter = { lat, lng };
    this.showSearchAreaButton.set(false);

    if (origin === 'geolocation' && this.map) {
      this.userLocationMarker?.remove();

      this.userLocationMarker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1,
      })
        .addTo(this.map)
        .bindPopup('Tu ubicación actual');
    }

    if (recenterMap && this.map) {
      this.map.setView([lat, lng], 12);
    }

    this.loadRadiusPage();
  }

  private loadRadiusPage(): void {
    const center = this.radiusCenter();

    if (!center) {
      return;
    }

    this.territoryLoading.set(true);

    this.publicationsService
      .searchNeeds({
        lat: center.lat,
        lng: center.lng,
        radius: RADIUS_KM,
        page: this.territoryPage(),
        limit: TERRITORY_PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          this.allNeeds.set(result.items);
          this.territoryTotalPages.set(result.totalPages);
          this.territoryTotal.set(result.total);
          this.territoryLoading.set(false);
          this.needsDataLoaded = true;
          this.checkFullyLoaded();
          this.renderMarkers();
        },
        error: () => {
          this.territoryLoading.set(false);
          this.needsDataLoaded = true;
          this.checkFullyLoaded();
        },
      });
  }

  private loadLocalityPage(): void {
    const locality = this.territoryFilter();

    if (!locality) {
      return;
    }

    this.territoryLoading.set(true);

    this.publicationsService
      .searchNeeds({
        locality,
        page: this.territoryPage(),
        limit: TERRITORY_PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          this.allNeeds.set(result.items);
          this.territoryTotalPages.set(result.totalPages);
          this.territoryTotal.set(result.total);
          this.territoryLoading.set(false);
          this.needsDataLoaded = true;
          this.checkFullyLoaded();
          this.renderMarkers();
        },
        error: () => {
          this.territoryLoading.set(false);
          this.needsDataLoaded = true;
          this.checkFullyLoaded();
        },
      });
  }

  setTerritoryFilter(locality: string): void {
    if (!locality) {
      this.loadAllDefault();
      return;
    }

    this.searchMode.set('locality');
    this.territoryFilter.set(locality);
    this.radiusCenter.set(null);
    this.territoryPage.set(1);
    this.loadLocalityPage();
  }

  goToTerritoryPage(page: number): void {
    if (
      page < 1 ||
      page > this.territoryTotalPages()
    ) {
      return;
    }

    this.territoryPage.set(page);

    if (this.searchMode() === 'locality') {
      this.loadLocalityPage();
    } else if (this.searchMode() === 'radius') {
      this.loadRadiusPage();
    }
  }

  // El botón flotante de "Buscar en esta zona": toma el centro actual del
  // mapa (a donde sea que el usuario haya arrastrado/zoomeado) y busca ahí,
  // con el mismo radio de 100km.
  searchThisArea(): void {
    if (!this.map) {
      return;
    }

    const center = this.map.getCenter();

    this.startRadiusSearch(
      center.lat,
      center.lng,
      false,
      'manual',
    );
  }

  private onMapMoved(): void {
    if (!this.map) {
      return;
    }

    const center = this.map.getCenter();

    const distanceKm = this.haversineKm(
      center.lat,
      center.lng,
      this.lastSearchedCenter.lat,
      this.lastSearchedCenter.lng,
    );

    this.showSearchAreaButton.set(
      distanceKm > MOVE_THRESHOLD_KM,
    );
  }

  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371;
    const toRad = (deg: number) =>
      (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;

    return (
      R *
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a),
      )
    );
  }

  setKindFilter(kind: FilterKind): void {
    this.kindFilter.set(kind);
    this.renderMarkers();
  }

  toggleCategoryFilter(id: number): void {
    const next = new Set(this.categoryFilter());

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    this.categoryFilter.set(next);
    this.renderMarkers();
  }

  clearCategoryFilters(): void {
    this.categoryFilter.set(new Set());
    this.renderMarkers();
  }

  isCategoryActive(id: number): boolean {
    return this.categoryFilter().has(id);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.renderMarkers();
  }

  private renderMarkers(): void {
    if (!this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();

    const kind = this.kindFilter();

    if (kind !== 'recursos') {
      this.filteredNeeds().forEach((need) => {
        const icon = this.buildNeedIcon();

        L.marker(
          [need.latitude, need.longitude],
          { icon },
        )
          .addTo(this.markersLayer!)
          .on('click', () => {
            this.router.navigate([
              '/publicar/quiero-ayudar',
              need.id,
            ]);
          });
      });
    }

    if (kind !== 'necesidades') {
      this.filteredResources().forEach(
        (resource) => {
          const icon = this.buildResourceIcon();

          L.marker(
            [resource.latitude, resource.longitude],
            { icon },
          )
            .addTo(this.markersLayer!)
            .bindPopup(
              this.buildResourcePopupHtml(resource),
            );
        },
      );
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private buildResourcePopupHtml(
    resource: Resource,
  ): string {
    const title = this.escapeHtml(
      resource.title,
    );

    const description = this.escapeHtml(
      resource.description,
    );

    const imageHtml = resource.imageUrl
      ? `<img class="v2map-popup__img" src="${this.escapeHtml(
          resource.imageUrl,
        )}" alt="" />`
      : '';

    const orgHtml = resource.organization
      ? `<div class="v2map-popup__org">
          🏢 ${this.escapeHtml(resource.organization.name)}
          ${
            resource.organization.verified
              ? '<span class="v2map-popup__verified">✓ Verificada</span>'
              : ''
          }
        </div>`
      : '';

    const scheduleHtml = resource.schedule
      ? `<div class="v2map-popup__row">🕒 ${this.escapeHtml(
          resource.schedule,
        )}</div>`
      : '';

    let contactHtml =
      '<p class="v2map-popup__no-contact">Sin contacto público disponible.</p>';

    if (resource.contactInfo) {
      const raw = resource.contactInfo;
      const digits = raw.replace(/[^\d+]/g, '');
      const isEmail = raw.includes('@');
      const isPhone =
        !isEmail &&
        digits.length >= 6;

      if (isPhone) {
        contactHtml =
          `<a class="v2map-popup__contact-btn" ` +
          `href="tel:${digits}">📞 Llamar — ${this.escapeHtml(raw)}</a>`;
      } else if (isEmail) {
        contactHtml =
          `<a class="v2map-popup__contact-btn" ` +
          `href="mailto:${raw}">✉️ Escribir — ${this.escapeHtml(raw)}</a>`;
      } else {
        contactHtml =
          `<p class="v2map-popup__row">${this.escapeHtml(raw)}</p>`;
      }
    }

    return `
      <div class="v2map-popup">
        ${imageHtml}
        ${orgHtml}
        <strong>${title}</strong>
        <p class="v2map-popup__desc">${description}</p>
        ${scheduleHtml}
        ${contactHtml}
      </div>
    `;
  }

  goToPublicar(): void {
    this.router.navigateByUrl('/publicar');
  }

  ngOnDestroy(): void {
    this.userLocationMarker?.remove();
    this.userLocationMarker = undefined;

    this.map?.remove();
    this.map = undefined;
  }
}