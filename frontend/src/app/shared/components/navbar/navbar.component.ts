import { Component, HostListener, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatToolbarModule,
    MatIconModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnDestroy {
  isMenuOpen = false;

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    this.syncBodyScrollLock();
  }

  closeMenu(): void {
    if (!this.isMenuOpen) {
      return;
    }
    this.isMenuOpen = false;
    this.syncBodyScrollLock();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeMenu();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('mobile-menu-open');
  }

  private syncBodyScrollLock(): void {
    document.body.classList.toggle('mobile-menu-open', this.isMenuOpen);
  }
}
