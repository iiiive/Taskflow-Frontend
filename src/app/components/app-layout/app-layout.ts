import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AppSidebar } from '../app-sidebar/app-sidebar';
import { AppTopbar } from '../app-topbar/app-topbar';

type ShellContext = 'user' | 'org' | 'admin';

/**
 * Single authenticated layout shell: a fixed sidebar + a shared top bar
 * (search, notifications, settings) wrapping the routed page. The admin/org/user
 * context is derived from the URL so individual pages no longer wire it up.
 */
@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, AppSidebar, AppTopbar],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss',
})
export class AppLayout implements OnInit, OnDestroy {
  adminMode = false;
  orgMode = false;
  context: ShellContext = 'user';

  private routerSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.applyContext(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event =>
        this.applyContext((event as NavigationEnd).urlAfterRedirects)
      );
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private applyContext(url: string): void {
    const path = url.split('?')[0];

    if (path === '/admin' || path.startsWith('/admin/')) {
      this.context = 'admin';
      this.adminMode = true;
      this.orgMode = false;
    } else if (path === '/org' || path.startsWith('/org/')) {
      this.context = 'org';
      this.adminMode = false;
      this.orgMode = true;
    } else {
      this.context = 'user';
      this.adminMode = false;
      this.orgMode = false;
    }
  }
}
