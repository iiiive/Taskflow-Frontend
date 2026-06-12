import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { userOnlyGuard } from './guards/user-only.guard';
import { orgAdminGuard } from './guards/org-admin.guard';
import { AppLayout } from './components/app-layout/app-layout';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Public routes (no shell)
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register)
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword)
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password').then(m => m.ResetPassword)
  },

  // Authenticated app — shared sidebar + top bar shell
  {
    path: '',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects',
        loadComponent: () => import('./pages/workspaces/workspaces').then(m => m.Workspaces),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/board',
        loadComponent: () =>
          import('./pages/workspace-board/workspace-board').then(m => m.WorkspaceBoard),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/backlog',
        loadComponent: () =>
          import('./pages/workspace-backlog/workspace-backlog').then(m => m.WorkspaceBacklog),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/activity',
        loadComponent: () =>
          import('./pages/workspace-activity/workspace-activity').then(m => m.WorkspaceActivity),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/archive',
        loadComponent: () =>
          import('./pages/workspace-archive/workspace-archive').then(m => m.WorkspaceArchive),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/timesheet',
        loadComponent: () =>
          import('./pages/workspace-timesheet/workspace-timesheet').then(m => m.WorkspaceTimesheet),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams').then(m => m.Teams),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/sprints',
        loadComponent: () =>
          import('./pages/workspace-sprints/workspace-sprints').then(m => m.WorkspaceSprints),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/workflows',
        loadComponent: () =>
          import('./pages/workspace-workflows/workspace-workflows').then(m => m.WorkspaceWorkflows),
        canActivate: [authGuard, userOnlyGuard]
      },
      {
        path: 'projects/:id/reports',
        loadComponent: () =>
          import('./pages/reports/reports').then(m => m.Reports),
        canActivate: [authGuard, userOnlyGuard]
      },

      {
        path: 'admin',
        canActivate: [authGuard, adminGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard)
          },
          {
            path: 'organizations',
            loadComponent: () =>
              import('./pages/admin/admin-organizations/admin-organizations').then(m => m.AdminOrganizations)
          },
          {
            path: 'plans',
            loadComponent: () =>
              import('./pages/admin/admin-plans/admin-plans').then(m => m.AdminPlans)
          },
          {
            path: 'profile',
            loadComponent: () => import('./pages/profile/profile').then(m => m.Profile)
          }
        ]
      },

      {
        path: 'org',
        canActivate: [authGuard, orgAdminGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/org/org-overview/org-overview').then(m => m.OrgOverview)
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./pages/org/org-users/org-users').then(m => m.OrgUsers)
          },
          {
            path: 'projects',
            loadComponent: () =>
              import('./pages/org/org-projects/org-projects').then(m => m.OrgProjects)
          },
          {
            path: 'teams',
            loadComponent: () =>
              import('./pages/org/org-teams/org-teams').then(m => m.OrgTeams)
          },
          {
            path: 'profile',
            loadComponent: () => import('./pages/profile/profile').then(m => m.Profile)
          }
        ]
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];
