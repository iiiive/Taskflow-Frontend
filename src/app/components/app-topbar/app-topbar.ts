import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { Auth } from '../../services/auth/auth';
import {
  SearchGroup,
  SearchResultItem,
  SearchService,
} from '../../services/search/search.service';
import { NotificationBell } from '../notification-bell/notification-bell';

type ShellContext = 'user' | 'org' | 'admin';

/**
 * Shared top bar rendered by AppLayout on every authenticated page:
 * global search (left), notifications + settings/profile menu (right).
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationBell],
  templateUrl: './app-topbar.html',
  styleUrl: './app-topbar.scss',
})
export class AppTopbar implements OnInit, OnDestroy {
  @Input() context: ShellContext = 'user';

  private auth = inject(Auth);
  private search = inject(SearchService);
  private router = inject(Router);

  // Search state
  query = '';
  searchOpen = false;
  searching = false;
  groups: SearchGroup[] = [];

  // Settings menu state
  menuOpen = false;

  // Current user
  userName = 'User';
  userEmail = '';
  avatarUrl: string | null = null;

  private queryInput$ = new Subject<string>();
  private subs = new Subscription();

  ngOnInit(): void {
    this.loadStoredUser();

    this.subs.add(
      this.auth.getProfile().subscribe({
        next: (res: any) => {
          const user = res?.user || res?.data || res;
          if (user) {
            localStorage.setItem('planora_user', JSON.stringify(user));
            this.setUserDisplay(user);
          }
        },
        error: () => {},
      })
    );

    this.subs.add(
      this.queryInput$
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(term => {
            this.searching = true;
            return this.search.search(term);
          })
        )
        .subscribe({
          next: (res) => {
            this.groups = (res?.data ?? []).filter(g => g.items?.length);
            this.searching = false;
            this.searchOpen = true;
          },
          error: () => {
            this.groups = [];
            this.searching = false;
          },
        })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /* ---------------- Search ---------------- */

  onSearchInput(): void {
    const term = this.query.trim();
    if (term.length < 2) {
      this.groups = [];
      this.searchOpen = term.length > 0;
      this.searching = false;
      return;
    }
    this.searchOpen = true;
    this.queryInput$.next(term);
  }

  onSearchFocus(): void {
    if (this.query.trim().length >= 2 && this.groups.length) {
      this.searchOpen = true;
    }
  }

  selectResult(item: SearchResultItem): void {
    this.searchOpen = false;
    this.query = '';
    this.groups = [];
    if (item.route) {
      this.router.navigateByUrl(item.route);
    }
  }

  clearSearch(): void {
    this.query = '';
    this.groups = [];
    this.searchOpen = false;
  }

  get hasResults(): boolean {
    return this.groups.some(g => g.items.length > 0);
  }

  /* ---------------- Settings menu ---------------- */

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  get profileLink(): string {
    if (this.context === 'admin') return '/admin/profile';
    if (this.context === 'org') return '/org/profile';
    return '/profile';
  }

  logout(): void {
    this.menuOpen = false;
    this.auth.logout().subscribe({
      next: () => this.clearSession(),
      error: () => this.clearSession(),
    });
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('planora_token');
    localStorage.removeItem('planora_user');
    localStorage.removeItem('planora_sidebar_collapsed');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  /* ---------------- User display ---------------- */

  getUserInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }

  private loadStoredUser(): void {
    const stored = localStorage.getItem('planora_user');
    if (!stored) return;
    try {
      this.setUserDisplay(JSON.parse(stored));
    } catch {
      /* ignore malformed cache */
    }
  }

  private setUserDisplay(user: any): void {
    this.userName = user?.name || 'User';
    this.userEmail = user?.email || '';
    this.avatarUrl = user?.avatar_url || user?.avatar || null;
  }

  /* ---------------- Outside-click / Esc ---------------- */

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const el = event.target as HTMLElement;
    if (!el.closest('.topbar-search')) {
      this.searchOpen = false;
    }
    if (!el.closest('.topbar-account')) {
      this.menuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.searchOpen = false;
    this.menuOpen = false;
  }
}
