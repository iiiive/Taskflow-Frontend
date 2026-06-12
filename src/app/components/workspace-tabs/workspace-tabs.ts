import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type WorkspaceTab = 'board' | 'backlog' | 'activity' | 'timesheet' | 'archive';

/**
 * Shared project section tab strip (Development Board / Backlog / Activity /
 * Timesheet / Archive). The Backlog tab is shown only for Scrum projects.
 */
@Component({
  selector: 'app-workspace-tabs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './workspace-tabs.html',
  styleUrl: './workspace-tabs.scss',
})
export class WorkspaceTabs {
  @Input() workspaceId!: number;
  @Input() active: WorkspaceTab = 'board';
  @Input() isScrum = false;
}
