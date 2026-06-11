import { CommonModule } from '@angular/common';
import {
  Component,
  HostBinding,
  Input,
  OnInit,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../services/auth/auth';

type SidebarPage =
  | 'dashboard'
  | 'projects'
  | 'teams'
  | 'profile'
  | 'backlog'
  | 'board'
  | 'activity'
  | 'timesheet'
  | 'archive'
  | 'sprints'
  | 'workflows'
  | 'overview'
  | 'organizations'
  | 'plans'
  | 'org-overview'
  | 'org-users'
  | 'org-projects'
  | 'org-teams'
  | '';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './app-sidebar.html',
  styleUrl: './app-sidebar.scss',
})
export class AppSidebar implements OnInit {
  @Input() activePage: SidebarPage = '';
  @Input() workspaceId: number | null = null;
  @Input() adminMode = false;
  @Input() orgMode = false;

  @HostBinding('class.sidebar-collapsed-host')
  isCollapsed = false;

  userName = 'User';
  userEmail = '';
  avatarUrl: string | null = null;

  currentUrl = '';
  selectedWorkspaceId: number | null = null;

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    const savedSidebarState = localStorage.getItem('planora_sidebar_collapsed');

    this.isCollapsed = savedSidebarState === 'true';
    this.applySidebarLayoutState();

    this.currentUrl = this.router.url;
    this.syncSidebarWithCurrentRoute();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navigationEnd = event as NavigationEnd;
        this.currentUrl = navigationEnd.urlAfterRedirects;
        this.syncSidebarWithCurrentRoute();
      });

    this.loadStoredUser();
    this.loadProfile();
  }

  collapseSidebar(): void {
    this.isCollapsed = true;
    localStorage.setItem('planora_sidebar_collapsed', 'true');
    this.applySidebarLayoutState();
  }

  expandSidebar(): void {
    this.isCollapsed = false;
    localStorage.setItem('planora_sidebar_collapsed', 'false');
    this.applySidebarLayoutState();
  }

  toggleSidebar(): void {
    this.isCollapsed ? this.expandSidebar() : this.collapseSidebar();
  }

  applySidebarLayoutState(): void {
    const sidebarWidth = this.isCollapsed ? '92px' : '280px';

    document.documentElement.style.setProperty(
      '--planora-sidebar-width',
      sidebarWidth
    );

    document.body.classList.toggle(
      'planora-sidebar-collapsed',
      this.isCollapsed
    );
  }

  syncSidebarWithCurrentRoute(): void {
    const cleanUrl = this.currentUrl.split('?')[0];

    const workspaceSectionMatch = cleanUrl.match(
      /^\/projects\/(\d+)\/(backlog|board|activity|timesheet|archive|sprints|workflows)(\/)?$/
    );

    if (workspaceSectionMatch) {
      this.selectedWorkspaceId = Number(workspaceSectionMatch[1]);
      this.activePage = workspaceSectionMatch[2] as SidebarPage;
      return;
    }

    this.selectedWorkspaceId = null;

    if (cleanUrl === '/admin' || cleanUrl === '/admin/') {
      this.activePage = 'overview';
      return;
    }

    if (cleanUrl.startsWith('/admin/organizations')) {
      this.activePage = 'organizations';
      return;
    }

    if (cleanUrl.startsWith('/admin/plans')) {
      this.activePage = 'plans';
      return;
    }

    if (cleanUrl === '/org' || cleanUrl === '/org/') {
      this.activePage = 'org-overview';
      return;
    }

    if (cleanUrl.startsWith('/org/users')) {
      this.activePage = 'org-users';
      return;
    }

    if (cleanUrl.startsWith('/org/projects')) {
      this.activePage = 'org-projects';
      return;
    }

    if (cleanUrl.startsWith('/org/teams')) {
      this.activePage = 'org-teams';
      return;
    }

    if (cleanUrl.startsWith('/dashboard')) {
      this.activePage = 'dashboard';
      return;
    }

    if (cleanUrl === '/projects' || cleanUrl.startsWith('/projects')) {
      this.activePage = 'projects';
      return;
    }

    if (cleanUrl === '/teams' || cleanUrl.startsWith('/teams')) {
      this.activePage = 'teams';
      return;
    }

    if (cleanUrl.startsWith('/profile')) {
      this.activePage = 'profile';
      return;
    }

    this.activePage = '';
  }

  hasSelectedWorkspace(): boolean {
    return this.selectedWorkspaceId !== null || this.workspaceId !== null;
  }

  getSelectedWorkspaceId(): number | null {
    return this.selectedWorkspaceId || this.workspaceId;
  }

  loadStoredUser(): void {
    const storedUser = localStorage.getItem('planora_user');

    if (!storedUser) {
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      this.setUserDisplay(user);
    } catch {
      this.userName = 'User';
      this.userEmail = '';
      this.avatarUrl = null;
    }
  }

  loadProfile(): void {
    this.auth.getProfile().subscribe({
      next: (res: any) => {
        const user = res?.user || res?.data || res;

        if (user) {
          localStorage.setItem('planora_user', JSON.stringify(user));
          this.setUserDisplay(user);
        }
      },
      error: () => {
        this.loadStoredUser();
      },
    });
  }

  setUserDisplay(user: any): void {
    this.userName = user?.name || 'User';
    this.userEmail = user?.email || '';
    this.avatarUrl = user?.avatar_url || user?.avatar || null;
  }

  getUserInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.clearSession();
      },
      error: () => {
        this.clearSession();
      },
    });
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('planora_token');
    localStorage.removeItem('planora_user');
    localStorage.removeItem('planora_sidebar_collapsed');

    document.documentElement.style.setProperty('--planora-sidebar-width', '280px');
    document.body.classList.remove('planora-sidebar-collapsed');

    this.router.navigate(['/login'], { replaceUrl: true });
  }
}