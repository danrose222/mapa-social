import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { CategoriesService } from '../../core/services/categories.service';
import { PublicationsService } from '../../core/services/publications.service';
import { Category, Need } from '../../core/models/mapa-social.model';
import { IconComponent } from '../../shared/icons/icon.component';

@Component({
  selector: 'app-quiero-ayudar',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './quiero-ayudar.component.html',
  styleUrl: './quiero-ayudar.component.scss',
})
export class QuieroAyudarComponent {
  private readonly publicationsService = inject(PublicationsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly router = inject(Router);

  readonly isLoading = signal(true);
  readonly loadError = signal(false);
  readonly needs = signal<Need[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly currentIndex = signal(0);

  readonly currentNeed = computed<Need | null>(() => {
    const list = this.needs();
    const index = this.currentIndex();
    return list.length ? list[index % list.length] : null;
  });

  readonly categoryName = computed(() => {
    const need = this.currentNeed();
    if (!need) {
      return '';
    }
    return this.categories().find((c) => c.id === need.categoryId)?.name ?? '';
  });

  private dragStartX: number | null = null;
  readonly dragOffset = signal(0);

  constructor() {
    this.categoriesService.getAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => {},
    });

    this.publicationsService.getNeeds().subscribe({
      next: (needs) => {
        this.needs.set(needs.filter((n) => n.status === 'active'));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.loadError.set(true);
      },
    });
  }

  siguiente(): void {
    if (!this.needs().length) {
      return;
    }
    this.currentIndex.update((i) => (i + 1) % this.needs().length);
  }

  anterior(): void {
    if (!this.needs().length) {
      return;
    }
    this.currentIndex.update((i) => (i - 1 + this.needs().length) % this.needs().length);
  }

  ayudar(): void {
    const need = this.currentNeed();
    if (!need) {
      return;
    }
    this.router.navigate(['/publicar/quiero-ayudar', need.id]);
  }

  onPointerDown(event: PointerEvent): void {
    this.dragStartX = event.clientX;
  }

  onPointerMove(event: PointerEvent): void {
    if (this.dragStartX === null) {
      return;
    }
    this.dragOffset.set(event.clientX - this.dragStartX);
  }

  onPointerUp(): void {
    const offset = this.dragOffset();
    if (offset > 90) {
      this.anterior();
    } else if (offset < -90) {
      this.siguiente();
    }
    this.dragStartX = null;
    this.dragOffset.set(0);
  }
}
