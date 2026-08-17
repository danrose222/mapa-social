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
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';

import { AuthService } from '../../core/services/auth.service';
import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { Category, Need, Resource } from '../../core/models/mapa-social.model';
import { IconComponent } from '../../shared/icons/icon.component';

type FilterKind = 'todos' | 'necesidades' | 'recursos';

@Component({
  selector: 'app-mapa-home',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './mapa-home.component.html',
  styleUrl: './mapa-home.component.scss',
})
export class MapaHomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private mapContainer!: ElementRef<HTMLDivElement>;

  private readonly categoriesService = inject(CategoriesService);
  private readonly publicationsService = inject(PublicationsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);

  readonly kindFilter = signal<FilterKind>('todos');
  readonly categoryFilter = signal<Set<number>>(new Set());
  readonly searchTerm = signal('');

  private allNeeds: Need[] = [];
  private allResources: Resource[] = [];

  readonly visibleCount = computed(() => {
    const kind = this.kindFilter();
    const needs = kind === 'recursos' ? 0 : this.filteredNeeds().length;
    const resources = kind === 'necesidades' ? 0 : this.filteredResources().length;
    return needs + resources;
  });

  private filteredNeeds(): Need[] {
    return this.applyFilters(this.allNeeds);
  }

  private filteredResources(): Resource[] {
    return this.applyFilters(this.allResources);
  }

  private applyFilters<T extends { categoryId: number; title: string; description: string }>(
    items: T[],
  ): T[] {
    const categories = this.categoryFilter();
    const term = this.searchTerm().trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory = categories.size === 0 || categories.has(item.categoryId);
      const matchesTerm =
        term === '' ||
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }

  private map?: L.Map;
  private markersLayer?: L.LayerGroup;

  private readonly needIcon = L.icon({
    iconUrl: 'map-icons/marker-icon-orange.png',
    iconRetinaUrl: 'map-icons/marker-icon-2x-orange.png',
    shadowUrl: 'map-icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private readonly resourceIcon = L.icon({
    iconUrl: 'map-icons/marker-icon-blue.png',
    iconRetinaUrl: 'map-icons/marker-icon-2x-blue.png',
    shadowUrl: 'map-icons/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  ngAfterViewInit(): void {
    this.initializeMap();
    this.loadData();
  }

  private initializeMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [-31.4201, -64.1888],
      zoom: 13,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  private loadData(): void {
    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });

    Promise.all([
      this.publicationsService.getNeeds().toPromise(),
      this.publicationsService.getResources().toPromise(),
    ])
      .then(([needs, resources]) => {
        this.allNeeds = (needs ?? []).filter((n) => n.status === 'active');
        this.allResources = (resources ?? []).filter((r) => r.status === 'available');
        this.isLoading.set(false);
        this.renderMarkers();
      })
      .catch(() => {
        this.isLoading.set(false);
        this.loadError.set(true);
      });
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
        L.marker([need.latitude, need.longitude], { icon: this.needIcon })
          .addTo(this.markersLayer!)
          .bindPopup(`<strong>Necesidad</strong><br><strong>${need.title}</strong><br>${need.description}`);
      });
    }

    if (kind !== 'necesidades') {
      this.filteredResources().forEach((resource) => {
        L.marker([resource.latitude, resource.longitude], { icon: this.resourceIcon })
          .addTo(this.markersLayer!)
          .bindPopup(
            `<strong>Recurso</strong><br><strong>${resource.title}</strong><br>${resource.description}`,
          );
      });
    }
  }

  goToPublicar(): void {
    this.router.navigateByUrl('/publicar');
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }
}
