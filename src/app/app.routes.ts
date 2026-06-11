import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

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

  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },

  {
    path: 'projects',
    loadComponent: () => import('./pages/workspaces/workspaces').then(m => m.Workspaces),
    canActivate: [authGuard]
  },

  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/board',
    loadComponent: () =>
      import('./pages/workspace-board/workspace-board').then(m => m.WorkspaceBoard),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/backlog',
    loadComponent: () =>
      import('./pages/workspace-backlog/workspace-backlog').then(m => m.WorkspaceBacklog),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/activity',
    loadComponent: () =>
      import('./pages/workspace-activity/workspace-activity').then(m => m.WorkspaceActivity),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/archive',
    loadComponent: () =>
      import('./pages/workspace-archive/workspace-archive').then(m => m.WorkspaceArchive),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/timesheet',
    loadComponent: () =>
      import('./pages/workspace-timesheet/workspace-timesheet').then(m => m.WorkspaceTimesheet),
    canActivate: [authGuard]
  },

  {
    path: 'teams',
    loadComponent: () => import('./pages/teams/teams').then(m => m.Teams),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/sprints',
    loadComponent: () =>
      import('./pages/workspace-sprints/workspace-sprints').then(m => m.WorkspaceSprints),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/workflows',
    loadComponent: () =>
      import('./pages/workspace-workflows/workspace-workflows').then(m => m.WorkspaceWorkflows),
    canActivate: [authGuard]
  },

  {
    path: 'projects/:id/reports',
    loadComponent: () =>
      import('./pages/reports/reports').then(m => m.Reports),
    canActivate: [authGuard]
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
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];
