import { Routes } from '@angular/router';

import { Register } from './pages/register/register';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Workspaces } from './pages/workspaces/workspaces';
import { WorkspaceBoard } from './pages/workspace-board/workspace-board';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: Login
  },

  {
    path: 'register',
    component: Register
  },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },

  {
    path: 'workspaces',
    component: Workspaces,
    canActivate: [authGuard]
  },

  {
    path: 'workspaces/:id/backlog',
    loadComponent: () =>
      import('./pages/workspace-backlog/workspace-backlog').then(
        m => m.WorkspaceBacklog
      ),
    canActivate: [authGuard]
  },

  {
    path: 'workspaces/:id/board',
    component: WorkspaceBoard,
    canActivate: [authGuard]
  },

  {
    path: 'workspaces/:id/activity',
    loadComponent: () =>
      import('./pages/workspace-activity/workspace-activity').then(
        m => m.WorkspaceActivity
      ),
    canActivate: [authGuard]
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];