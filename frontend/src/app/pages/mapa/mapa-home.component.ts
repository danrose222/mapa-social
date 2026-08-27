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
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import * as L from 'leaflet';

import { AuthService } from '../../core/services/auth.service';
import { CategoriesService } from '../../core/services/categories.service';
import { GeorefService } from '../../core/services/georef.service';
import { NeedLocality, PublicationsService } from '../../core/services/publications.service';
import { Category, Need, Organization, Resource } from '../../core/models/mapa-social.model';
import { IconComponent } from '../../shared/icons/icon.component';
import { QuickNeedFormComponent } from '../../shared/components/quick-need-form/quick-need-form.component';
import { CollaborateModalComponent } from '../../shared/components/collaborate-modal/collaborate-modal.component';
import { ResourceRequestModalComponent } from '../../shared/components/resource-request-modal/resource-request-modal.component';
import { normalizeText } from '../../shared/utils/normalize-text.util';

type FilterKind = 'todos' | 'necesidades' | 'recursos';
type SearchMode = 'all' | 'locality' | 'radius';

const TERRITORY_PAGE_SIZE = 10;
// Cuando hay un término de búsqueda activo, se pide de una todo lo que
// entre en el radio/localidad en vez de una sola página -- si no, el
// buscador de texto solo filtraba entre las 10 necesidades ya cargadas de
// la página actual, y algo que matcheaba pero vivía en otra página
// (ej: por localidad) nunca aparecía aunque el texto fuera exacto. 100 es
// el máximo que acepta SearchNeedsDto (@Max(100)) del lado del backend.
const SEARCH_ALL_LIMIT = 100;
const RADIUS_KM = 100;
const DEFAULT_CENTER: [number, number] = [-31.4201, -64.1888];

// Si el mapa se movió más de esto desde el último punto buscado, aparece
// el botón de "Buscar en esta zona".
const MOVE_THRESHOLD_KM = 5;

@Component({
  selector: 'app-mapa-home',
  standalone: true,
  imports: [
    IconComponent,
    QuickNeedFormComponent,
    CollaborateModalComponent,
    ResourceRequestModalComponent,
  ],
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);

  // No hay un "usuario verificado" individual en este sistema (la
  // verificación es de organizaciones, no de personas) -- cualquier cuenta
  // logueada cuenta como el "verificado" que describe la tarjeta.
  readonly isAuthenticated = computed(() => this.authService.currentUser() !== null);
  readonly privacyNotice = signal<string | null>(null);

  // Leyenda dinámica según rol: un usuario común nunca recibe necesidades
  // del backend (ver NeedsService.resolveOrgViewer), así que mostrarle ese
  // ítem sería anunciar un marcador que jamás va a aparecer. Comunidad/ONG
  // sí las ve, filtradas a su jurisdicción. Un moderador tampoco recibe
  // necesidades (no pertenece a una organización), pero sí le sirve poder
  // distinguir en el mapa qué recursos publica una Comunidad y cuáles una
  // ONG -- son las que avala -- así que "suma" esos dos ítems en vez del
  // de Necesidad.
  readonly showNeedLegend = computed(() => this.authService.belongsToOrganization());
  readonly showActorLegend = computed(() => this.authService.isModerator());

  // Los dos CTA del hero de la Landing mandan acá con ?type=need o
  // ?type=help: en ambos casos hay que ver el mapa (recursos disponibles)
  // ANTES de pedir cuenta -- el login solo entra en juego recién si hace
  // click en una acción puntual (publicar, o "Quiero Colaborar" en el
  // popup de un recurso, que ni siquiera pide cuenta).
  private readonly entryType = this.route.snapshot.queryParamMap.get('type');
  readonly needEntryMode = this.entryType === 'need';

  // Sin sesión arranca en 'recursos' (las necesidades no se ocultan del
  // todo, pero no son la vista por defecto sin login); llegar con
  // ?type=need o ?type=help fuerza 'recursos' también para quien ya tiene
  // sesión -- el punto de ambas entradas es ver qué recursos hay
  // disponibles, no las necesidades de otros.
  readonly kindFilter = signal<FilterKind>(
    this.entryType === 'need' || this.entryType === 'help' || !this.authService.currentUser()
      ? 'recursos'
      : 'todos',
  );
  readonly categoryFilter = signal<Set<number>>(new Set());
  readonly searchTerm = signal('');

  // Debounce de la búsqueda de texto: cuando el modo de necesidades está
  // paginado (radius/locality), cada cambio dispara un refetch con
  // SEARCH_ALL_LIMIT en vez de la página chica -- ver el comentario de esa
  // constante para el motivo. Además, si lo tipeado geocodifica a un lugar
  // real, mueve el mapa ahí y busca en un radio -- el filtro de texto solo
  // matchea título/descripción/dirección, y la mayoría de los recursos no
  // tienen dirección cargada aunque estén ahí geográficamente.
  private readonly searchTermChanges = new Subject<void>();

  // Descarta una respuesta de geocodificación vieja si el usuario ya
  // volvió a tipear -- mismo patrón que necesito-ayuda.component.ts para
  // este mismo problema (una respuesta lenta no debe pisar algo más nuevo).
  private searchGeocodeId = 0;

  // loadRadiusPage()/loadLocalityPage() comparten este contador: los dos
  // escriben el mismo estado (allNeeds, territoryTotal*), así que una
  // respuesta vieja de cualquiera de las dos (ej. tocar "Buscar en esta
  // zona" y enseguida paginar) no debe pisar el resultado de un pedido
  // más nuevo, sea del mismo método o del otro.
  private territoryRequestId = 0;

  // flyToLocality() geocodifica de forma independiente -- no toca el
  // estado de arriba, así que tiene su propio contador en vez de
  // compartir territoryRequestId.
  private flyToRequestId = 0;

  // Indica que, después de cargar los resultados de una búsqueda por texto,
  // el mapa debe ajustarse para mostrarlos automáticamente.
  private focusAfterSearchLoad = false;

  constructor() {
    // Sin takeUntilDestroyed(), navegar fuera de /mapa dentro de la
    // ventana de debounce (ej. el usuario tipeó y se fue antes de los
    // 400ms) deja el timer pendiente vivo -- dispara geocode + searchNeeds
    // igual, y termina llamando renderMarkers() sobre un markersLayer de
    // un mapa Leaflet ya destruido en ngOnDestroy().
    this.searchTermChanges.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => {
      const term = this.searchTerm().trim();
      const requestId = ++this.searchGeocodeId;

      if (term.length < 3) {
        this.focusAfterSearchLoad = false;
        this.refetchNeedsForCurrentSearch();
        return;
      }

      this.georefService.geocodeLocality(term).subscribe({
        next: (point) => {
          if (requestId !== this.searchGeocodeId) {
            return;
          }

          if (point) {
            // Es una ubicación real: mantenemos el comportamiento actual.
            this.focusAfterSearchLoad = false;
            this.startRadiusSearch(point.lat, point.lng, true, 'manual');
          } else {
            // Es una búsqueda por contenido:
            // organización, título, descripción, horario, etc.
            this.focusAfterSearchLoad = true;
            this.refetchNeedsForCurrentSearch();

            // En modo "all" no hay una nueva carga paginada que esperar.
            if (this.searchMode() === 'all') {
              this.focusAfterSearchLoad = false;
              this.focusSearchResults();
            }
          }
        },
        error: () => {
          if (requestId === this.searchGeocodeId) {
            this.focusAfterSearchLoad = true;
            this.refetchNeedsForCurrentSearch();

            if (this.searchMode() === 'all') {
              this.focusAfterSearchLoad = false;
              this.focusSearchResults();
            }
          }
        },
      });
    });
  }

  private refetchNeedsForCurrentSearch(): void {
    if (this.searchMode() === 'radius') {
      this.territoryPage.set(1);
      this.loadRadiusPage();
    } else if (this.searchMode() === 'locality') {
      this.territoryPage.set(1);
      this.loadLocalityPage();
    }
  }

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

  // Sin sesión, solo se ofrecen como filtro las categorías que de hecho
  // tienen algún recurso disponible -- no hay una tabla separada de
  // "categorías de necesidad" vs "categorías de recurso", así que esto es
  // lo más parecido y honesto a "mostrar solo categorías de recursos
  // públicos" que se puede hacer con los datos reales.
  readonly visibleCategories = computed(() => {
    if (this.isAuthenticated()) {
      return this.categories();
    }

    const resourceCategoryIds = new Set(
      this.allResources().map((resource) => resource.categoryId),
    );

    return this.categories().filter((c) => resourceCategoryIds.has(c.id));
  });

  // Estado vacío de búsqueda: solo tiene sentido cuando los recursos están
  // a la vista (con kindFilter 'necesidades' no se muestran recursos en
  // absoluto, así que no hay "vacío" que señalar). Con 'todos', además,
  // no alcanza con que no haya recursos -- si hay necesidades visibles el
  // mapa no está vacío, así que el overlay de "no hay recursos" no debe
  // taparlo (contradiría lo que se ve en pantalla).
  readonly showEmptyState = computed(() => {
    if (this.isLoading() || this.kindFilter() === 'necesidades') {
      return false;
    }

    if (this.filteredResources().length > 0) {
      return false;
    }

    return this.kindFilter() !== 'todos' || this.filteredNeeds().length === 0;
  });

  readonly emptyStateMessage = computed(() => {
    const activeCategories = Array.from(this.categoryFilter());

    const categoryLabel =
      activeCategories.length === 1
        ? (this.categoryName(activeCategories[0]) ?? 'recursos')
        : 'recursos';

    const localityLabel = this.territoryFilter() ?? 'tu zona';

    return `No hay ${categoryLabel} disponible en ${localityLabel} ahora.`;
  });

  readonly showQuickNeedForm = signal(false);
  readonly quickNeedLat = signal(DEFAULT_CENTER[0]);
  readonly quickNeedLng = signal(DEFAULT_CENTER[1]);
  readonly quickNeedCategoryId = signal<number | null>(null);
  readonly quickNeedLocality = signal<string | null>(null);

  // Modal "Quiero Colaborar", abierto desde el popup de un recurso.
  readonly collaborateResource = signal<Resource | null>(null);

  // Modal "Solicitud express", abierto desde el popup de un recurso --
  // solo para usuarios logueados (ver solicitarRecurso()).
  readonly resourceRequestTarget = signal<Resource | null>(null);
  readonly resourceRequestCategoryName = computed(() => {
    const resource = this.resourceRequestTarget();
    return resource ? (this.categoryName(resource.categoryId) ?? '') : '';
  });

  // computed(), no un método plano: visibleCount, showEmptyState y
  // renderMarkers() leen esto varias veces en el mismo ciclo -- como
  // método, cada lectura repetía el filtro completo (normalizeText sobre
  // 6 campos más el lookup de categoría) desde cero; como computed(),
  // Angular cachea el resultado y solo lo recalcula cuando de verdad
  // cambia alguna de sus dependencias.
  private readonly filteredNeeds = computed(() => this.applyFilters(this.allNeeds()));

  private readonly filteredResources = computed(() => this.applyFilters(this.allResources()));

  private applyFilters<
    T extends {
      categoryId: number;
      title: string;
      description: string;
      address?: string;
      locality?: string;
      schedule?: string;
      organization?: { name: string } | null;
    },
  >(items: T[]): T[] {
    const categories = this.categoryFilter();
    // Sin normalizar, "cordoba" (como lo tipea la mayoría) nunca matchea
    // "Córdoba" guardado con tilde, ni "guemes" contra "Güemes" -- una
    // comparación de string plana es sensible a acentos/diéresis.
    const term = normalizeText(this.searchTerm());

    return items.filter((item) => {
      const matchesCategory =
        categories.size === 0 || categories.has(item.categoryId);

      // "nombre" -> title, "barrio" -> locality/address (los recursos no
      // tienen locality propia, solo address en texto libre), "tipo de
      // ayuda" -> nombre de la categoría, más horario y organización para
      // que "Alimentos" o el nombre de un comedor también encuentren algo
      // aunque esa palabra no esté en el título ni la descripción.
      const categoryName = this.categoryName(item.categoryId);
      const matchesTerm =
        term === '' ||
        normalizeText(item.title).includes(term) ||
        normalizeText(item.description).includes(term) ||
        (item.address ? normalizeText(item.address).includes(term) : false) ||
        (item.locality ? normalizeText(item.locality).includes(term) : false) ||
        (item.schedule ? normalizeText(item.schedule).includes(term) : false) ||
        (item.organization?.name ? normalizeText(item.organization.name).includes(term) : false) ||
        (categoryName ? normalizeText(categoryName).includes(term) : false);

      return matchesCategory && matchesTerm;
    });
  }

  private categoryName(categoryId: number): string | undefined {
    return this.categories().find((c) => c.id === categoryId)?.name;
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
  // mismo por tipo, coral/teal del resto del rediseño (no --need-color /
  // --help-color, que son otro par de tonos usado en botones); no varía
  // por categoría — eso ahora solo distingue a los chips de filtro.
  private readonly NEED_PIN_COLOR = '#e0512c';
  private readonly RESOURCE_PIN_COLOR = '#17857a';

  private readonly NEED_PIN_INNER = `
    <path d="M15 21c-5.4-3.7-9.4-6.7-9.4-10.7a4.3 4.3 0 0 1 8-2.7 4.3 4.3 0 0 1 8 2.7c0 4-4 7-9.4 10.7Z"
      fill="#fff"/>`;

  private readonly RESOURCE_PIN_INNER = `
    <rect x="11.3" y="16" width="7.4" height="8.4" rx="2" fill="#fff"/>
    <rect x="11.4" y="8" width="1.6" height="8.6" rx="0.8" fill="#fff"/>
    <rect x="13.4" y="6.2" width="1.6" height="10.4" rx="0.8" fill="#fff"/>
    <rect x="15.4" y="6.2" width="1.6" height="10.4" rx="0.8" fill="#fff"/>
    <rect x="17.4" y="8" width="1.6" height="8.6" rx="0.8" fill="#fff"/>
    <rect x="8.2" y="15.3" width="1.6" height="6" rx="0.8" fill="#fff" transform="rotate(-32 9 18.3)"/>`;

  // 'individual' (cuenta común, sin organización) es el caso más frecuente
  // y no suma badge -- solo comunidad/ONG traen un aval institucional que
  // vale la pena distinguir en el mapa. Municipio no publica needs/resources
  // directamente (avala organizaciones, ver /moderador/organizaciones), así
  // que no hace falta un tercer badge.
  private actorOf(item: { organization?: Organization | null }): 'individual' | 'comunidad' | 'ong' {
    const type = item.organization?.type;
    return type === 'comunidad' || type === 'ong' ? type : 'individual';
  }

  private buildPinIcon(
    kind: 'need' | 'resource',
    actor: 'individual' | 'comunidad' | 'ong',
  ): L.DivIcon {
    const color = kind === 'need' ? this.NEED_PIN_COLOR : this.RESOURCE_PIN_COLOR;
    const inner = kind === 'need' ? this.NEED_PIN_INNER : this.RESOURCE_PIN_INNER;

    // El badge de actor se pinta con el mismo color del pin (no un tono
    // nuevo) para no salirse de la paleta naranja/teal -- solo cambia la
    // letra adentro, C de Comunidad u O de ONG.
    const badge =
      actor === 'individual'
        ? ''
        : `<span class="mapa-pin__badge" style="border-color:${color}">${
            actor === 'comunidad' ? 'C' : 'O'
          }</span>`;

    return L.divIcon({
      className: `mapa-pin mapa-pin--${kind} mapa-pin--actor-${actor}`,
      html: `
        <div class="mapa-pin__body">
          <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0Z"
              fill="${color}" stroke="#fff" stroke-width="2"/>
            ${inner}
          </svg>
          ${badge}
        </div>`,
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
    // El popup de un recurso es HTML crudo inyectado por Leaflet, fuera del
    // árbol de Angular -- este es el único punto donde podemos engancharle
    // un listener real al botón "Quiero Colaborar" que arma
    // buildResourcePopupHtml().
    this.map.on('popupopen', (event: L.PopupEvent) => this.onPopupOpen(event));

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
    const requestId = ++this.territoryRequestId;

    this.publicationsService
      .searchNeeds({
        lat: center.lat,
        lng: center.lng,
        radius: RADIUS_KM,
        page: this.territoryPage(),
        limit: this.needsFetchLimit(),
      })
      .subscribe({
        next: (result) => {
          if (requestId !== this.territoryRequestId) {
            return;
          }
          this.allNeeds.set(result.items);
          this.territoryTotalPages.set(result.totalPages);
          this.territoryTotal.set(result.total);
          this.territoryLoading.set(false);
          this.needsDataLoaded = true;
          this.checkFullyLoaded();
          this.renderMarkers();

          if (this.focusAfterSearchLoad) {
            this.focusAfterSearchLoad = false;
            this.focusSearchResults();
          }
        },
        error: () => {
          if (requestId !== this.territoryRequestId) {
            return;
          }
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
    const requestId = ++this.territoryRequestId;

    this.publicationsService
      .searchNeeds({
        locality,
        page: this.territoryPage(),
        limit: this.needsFetchLimit(),
      })
      .subscribe({
        next: (result) => {
          if (requestId !== this.territoryRequestId) {
            return;
          }
          this.allNeeds.set(result.items);
          this.territoryTotalPages.set(result.totalPages);
          this.territoryTotal.set(result.total);
          this.territoryLoading.set(false);
          this.needsDataLoaded = true;
          this.checkFullyLoaded();
          this.renderMarkers();

          if (this.focusAfterSearchLoad) {
            this.focusAfterSearchLoad = false;
            this.focusSearchResults();
          }
        },
        error: () => {
          if (requestId !== this.territoryRequestId) {
            return;
          }
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
    this.flyToLocality(locality);
  }

  // No hay coordenadas de jurisdicción guardadas en la base (Municipio solo
  // tiene el nombre de la ciudad) -- se geocodifica el nombre contra Georef,
  // el mismo mecanismo que ya usa el resto del componente para ciudad de
  // perfil, y se mueve el mapa ahí con flyTo (paneo animado, a diferencia
  // del setView seco que usa la búsqueda por radio).
  private flyToLocality(locality: string): void {
    const requestId = ++this.flyToRequestId;

    this.georefService.geocodeLocality(locality).subscribe({
      next: (point) => {
        if (requestId !== this.flyToRequestId) {
          return;
        }
        if (point && this.map) {
          this.map.flyTo([point.lat, point.lng], 13);
        }
      },
      error: () => {},
    });
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
    if (kind !== 'recursos' && !this.isAuthenticated()) {
      this.privacyNotice.set(
        'Para proteger la privacidad, estas opciones requieren registro verificado.',
      );
      return;
    }

    this.privacyNotice.set(null);
    this.kindFilter.set(kind);
    this.renderMarkers();
  }

  isKindLocked(kind: FilterKind): boolean {
    return kind !== 'recursos' && !this.isAuthenticated();
  }

  dismissPrivacyNotice(): void {
    this.privacyNotice.set(null);
  }

  goToLogin(volver = 'mapa'): void {
    this.router.navigate(['/entrar'], { queryParams: { volver } });
  }

  // Publicar una necesidad privada requiere estar logueado (mismo modelo
  // que el resto de la app -- no hay publicación anónima en ningún lado),
  // así que sin sesión manda directo a /entrar en vez de abrir el modal.
  openQuickNeedForm(): void {
    if (!this.isAuthenticated()) {
      this.goToLogin();
      return;
    }

    const center =
      this.radiusCenter() ??
      (this.map
        ? { lat: this.map.getCenter().lat, lng: this.map.getCenter().lng }
        : { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });

    this.quickNeedLat.set(center.lat);
    this.quickNeedLng.set(center.lng);

    const activeCategories = Array.from(this.categoryFilter());
    this.quickNeedCategoryId.set(
      activeCategories.length === 1 ? activeCategories[0] : null,
    );
    this.quickNeedLocality.set(this.territoryFilter());

    this.showQuickNeedForm.set(true);
  }

  closeQuickNeedForm(): void {
    this.showQuickNeedForm.set(false);
  }

  // "Solicitar este recurso" desde el popup (modo ?type=need): a
  // diferencia de "Quiero Colaborar", esto sí exige cuenta -- pedís que
  // una organización te contacte, así que necesitamos poder identificarte.
  // Con sesión abre el modal "express" (ResourceRequestModalComponent):
  // contacto y jurisdicción se heredan del perfil, no se vuelven a pedir
  // como en el formulario genérico de necesidad privada (ese sigue
  // existiendo tal cual para el botón flotante "Publicar mi necesidad").
  solicitarRecurso(resourceId: number): void {
    const resource = this.allResources().find((r) => r.id === resourceId);
    if (!resource) {
      return;
    }

    if (!this.isAuthenticated()) {
      this.goToLogin('mapa?type=need');
      return;
    }

    this.resourceRequestTarget.set(resource);
    this.map?.closePopup();
  }

  closeResourceRequestModal(): void {
    this.resourceRequestTarget.set(null);
  }

  private onPopupOpen(event: L.PopupEvent): void {
    const el = event.popup.getElement();
    if (!el) {
      return;
    }

    const collabButton = el.querySelector<HTMLButtonElement>(
      '[data-collab-resource-id]',
    );
    if (collabButton) {
      const resourceId = Number(collabButton.dataset['collabResourceId']);
      L.DomEvent.on(collabButton, 'click', (domEvent: Event) => {
        L.DomEvent.stop(domEvent);
        const resource = this.allResources().find((r) => r.id === resourceId);
        if (resource) {
          this.collaborateResource.set(resource);
          this.map?.closePopup();
        }
      });
    }

    const solicitarButton = el.querySelector<HTMLButtonElement>(
      '[data-solicitar-resource-id]',
    );
    if (solicitarButton) {
      const resourceId = Number(solicitarButton.dataset['solicitarResourceId']);
      L.DomEvent.on(solicitarButton, 'click', (domEvent: Event) => {
        L.DomEvent.stop(domEvent);
        this.solicitarRecurso(resourceId);
      });
    }
  }

  closeCollaborateModal(): void {
    this.collaborateResource.set(null);
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
    this.searchTermChanges.next();
  }

  // Mientras se busca texto, conviene traer de una todo lo que entre en
  // el radio/localidad actual en vez de una sola página (ver
  // SEARCH_ALL_LIMIT) -- sin término activo, se mantiene la paginación
  // normal.
  private needsFetchLimit(): number {
    return this.searchTerm().trim() ? SEARCH_ALL_LIMIT : TERRITORY_PAGE_SIZE;
  }

  private focusSearchResults(): void {
    if (!this.map || !this.searchTerm().trim()) {
      return;
    }

    const kind = this.kindFilter();
    const points: L.LatLngExpression[] = [];

    if (kind !== 'recursos') {
      this.filteredNeeds().forEach((need) => {
        points.push([need.latitude, need.longitude]);
      });
    }

    if (kind !== 'necesidades') {
      this.filteredResources().forEach((resource) => {
        points.push([resource.latitude, resource.longitude]);
      });
    }

    if (points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(points);

    this.map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 14,
    });
  }

  private renderMarkers(): void {
    if (!this.markersLayer) {
      return;
    }

    this.markersLayer.clearLayers();

    const kind = this.kindFilter();

    if (kind !== 'recursos') {
      this.filteredNeeds().forEach((need) => {
        const icon = this.buildPinIcon('need', this.actorOf(need));

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
          const icon = this.buildPinIcon('resource', this.actorOf(resource));

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
          `href="mailto:${this.escapeHtml(raw)}">✉️ Escribir — ${this.escapeHtml(raw)}</a>`;
      } else {
        contactHtml =
          `<p class="v2map-popup__row">${this.escapeHtml(raw)}</p>`;
      }
    }

    // Botón contextual según por qué puerta entró al mapa (?type=need vs.
    // el resto): "pedir" y "dar" son intenciones distintas, así que solo
    // se muestra UNA de las dos, nunca ambas -- mismo estilo visual para
    // las dos (v2map-popup__collab-btn), esto es solo texto/acción.
    // Solo tiene sentido con una organización detrás -- el recurso de un
    // individuo no tiene a quién pedirle ni con quién colaborar.
    const actionHtml = resource.organizationId
      ? this.needEntryMode
        ? `<button type="button" class="v2map-popup__collab-btn" ` +
          `data-solicitar-resource-id="${resource.id}">🤝 Solicitar este recurso</button>`
        : `<button type="button" class="v2map-popup__collab-btn" ` +
          `data-collab-resource-id="${resource.id}">❤️ Quiero Colaborar</button>`
      : '';

    // Quien entra a "colaborar" (donante) no está buscando ESTE recurso
    // puntual -- está buscando A QUIÉN dárselo. El popup se reencuadra
    // alrededor de la organización (nombre grande, el recurso pasa a ser
    // un dato secundario) y esconde el contacto directo: mostrar el
    // teléfono acá arruinaría el propósito del modal "Quiero Colaborar"
    // (contacto anónimo sin exponer datos privados) que se armó
    // específicamente para este flujo. Con "Solicitar este recurso" (modo
    // ?type=need) el recurso puntual SÍ es lo que la persona busca, así
    // que ahí se mantiene el encuadre y el contacto directo de siempre.
    const isDonorMode = !this.needEntryMode;

    const bodyHtml =
      isDonorMode && resource.organization
        ? `
          <div class="v2map-popup__org-heading">
            🏢 <strong>${this.escapeHtml(resource.organization.name)}</strong>
            ${
              resource.organization.verified
                ? '<span class="v2map-popup__verified">✓ Verificada</span>'
                : ''
            }
          </div>
          <p class="v2map-popup__offers">Ofrece: ${title}</p>
          <p class="v2map-popup__desc">${description}</p>
          ${scheduleHtml}
          ${actionHtml}
        `
        : `
          ${orgHtml}
          <strong>${title}</strong>
          <p class="v2map-popup__desc">${description}</p>
          ${scheduleHtml}
          ${contactHtml}
          ${actionHtml}
        `;

    return `
      <div class="v2map-popup">
        ${imageHtml}
        ${bodyHtml}
      </div>
    `;
  }

  ngOnDestroy(): void {
    this.userLocationMarker?.remove();
    this.userLocationMarker = undefined;

    this.map?.remove();
    this.map = undefined;
  }
}