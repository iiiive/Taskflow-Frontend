import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppSidebar } from '../../components/app-sidebar/app-sidebar';
import {
  WORKFLOW_REQUIRED_FIELD_OPTIONS,
  WORKFLOW_REQUIRED_FIELD_LABELS
} from '../../constants/planora.constants';

interface WorkflowState {
  id: number;
  name: string;
  color: string;
  position: number;
  is_initial: boolean;
  is_final: boolean;
  requires_approval: boolean;
  required_fields?: string[];
}

interface WorkflowTransition {
  id: number;
  from_state_id: number;
  to_state_id: number;
  name?: string | null;
}

interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  states?: WorkflowState[];
  transitions?: WorkflowTransition[];
}

@Component({
  selector: 'app-workspace-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSidebar],
  templateUrl: './workspace-workflows.html',
  styleUrl: './workspace-workflows.scss',
})
export class WorkspaceWorkflows implements OnInit {
  private apiUrl = environment.apiUrl;

  projectId!: number;
  workflows: WorkflowTemplate[] = [];
  selectedWorkflow: WorkflowTemplate | null = null;

  loading = true;
  loadingDetail = false;
  errorMessage = '';
  successMessage = '';

  showCreateWorkflowModal = false;
  showAddStateModal = false;
  showAddTransitionModal = false;
  creating = false;

  newWorkflow = { name: '', description: '' };

  newState = {
    name: '',
    color: '#547A95',
    is_initial: false,
    is_final: false,
    requires_approval: false,
    required_fields: [] as string[],
  };

  requiredFieldOptions = WORKFLOW_REQUIRED_FIELD_OPTIONS;
  draggedState: WorkflowState | null = null;

  requiredFieldLabel(field: string): string {
    return WORKFLOW_REQUIRED_FIELD_LABELS[field] ?? field;
  }

  toggleNewStateRequiredField(field: string): void {
    const fields = this.newState.required_fields;
    this.newState.required_fields = fields.includes(field)
      ? fields.filter(f => f !== field)
      : [...fields, field];
  }

  isNewStateFieldSelected(field: string): boolean {
    return this.newState.required_fields.includes(field);
  }

  newTransition = {
    from_state_id: null as number | null,
    to_state_id: null as number | null,
    name: '',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.projectId) {
      this.router.navigate(['/projects']);
      return;
    }
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/projects/${this.projectId}/workflows`).subscribe({
      next: (res) => {
        this.workflows = Array.isArray(res?.data) ? res.data : [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to load workflows.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectWorkflow(workflow: WorkflowTemplate): void {
    this.loadingDetail = true;
    this.selectedWorkflow = null;
    this.errorMessage = '';
    this.http.get<any>(`${this.apiUrl}/workflows/${workflow.id}`).subscribe({
      next: (res) => {
        this.selectedWorkflow = res?.data ?? res;
        this.loadingDetail = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to load workflow.';
        this.loadingDetail = false;
        this.cdr.detectChanges();
      },
    });
  }

  createWorkflow(): void {
    if (!this.newWorkflow.name.trim()) {
      this.errorMessage = 'Workflow name is required.';
      return;
    }
    this.creating = true;
    this.errorMessage = '';
    this.http.post<any>(`${this.apiUrl}/projects/${this.projectId}/workflows`, this.newWorkflow).subscribe({
      next: (res) => {
        const wf = res?.data ?? res;
        this.workflows = [wf, ...this.workflows];
        this.creating = false;
        this.showCreateWorkflowModal = false;
        this.successMessage = 'Workflow created.';
        this.selectWorkflow(wf);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creating = false;
        this.errorMessage = err?.error?.message || 'Unable to create workflow.';
        this.cdr.detectChanges();
      },
    });
  }

  addState(): void {
    if (!this.selectedWorkflow || !this.newState.name.trim()) return;
    this.http.post<any>(`${this.apiUrl}/workflows/${this.selectedWorkflow.id}/states`, this.newState).subscribe({
      next: (res) => {
        const state = res?.data ?? res;
        if (this.selectedWorkflow) {
          this.selectedWorkflow.states = [...(this.selectedWorkflow.states ?? []), state];
          this.selectedWorkflow.states.sort((a, b) => a.position - b.position);
        }
        this.newState = { name: '', color: '#547A95', is_initial: false, is_final: false, requires_approval: false, required_fields: [] };
        this.showAddStateModal = false;
        this.successMessage = 'State added.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to add state.';
        this.cdr.detectChanges();
      },
    });
  }

  removeState(state: WorkflowState): void {
    if (!this.selectedWorkflow || !confirm(`Remove state "${state.name}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/workflows/${this.selectedWorkflow.id}/states/${state.id}`).subscribe({
      next: () => {
        if (this.selectedWorkflow) {
          this.selectedWorkflow.states = (this.selectedWorkflow.states ?? []).filter(s => s.id !== state.id);
          this.selectedWorkflow.transitions = (this.selectedWorkflow.transitions ?? []).filter(
            t => t.from_state_id !== state.id && t.to_state_id !== state.id
          );
        }
        this.successMessage = 'State removed.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to remove state.';
        this.cdr.detectChanges();
      },
    });
  }

  addTransition(): void {
    if (!this.selectedWorkflow || !this.newTransition.from_state_id || !this.newTransition.to_state_id) return;
    this.http.post<any>(`${this.apiUrl}/workflows/${this.selectedWorkflow.id}/transitions`, this.newTransition).subscribe({
      next: (res) => {
        const transition = res?.data ?? res;
        if (this.selectedWorkflow) {
          this.selectedWorkflow.transitions = [...(this.selectedWorkflow.transitions ?? []), transition];
        }
        this.newTransition = { from_state_id: null, to_state_id: null, name: '' };
        this.showAddTransitionModal = false;
        this.successMessage = 'Transition added.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to add transition.';
        this.cdr.detectChanges();
      },
    });
  }

  removeTransition(transition: WorkflowTransition): void {
    if (!this.selectedWorkflow) return;
    this.http.delete<any>(`${this.apiUrl}/workflows/${this.selectedWorkflow.id}/transitions/${transition.id}`).subscribe({
      next: () => {
        if (this.selectedWorkflow) {
          this.selectedWorkflow.transitions = (this.selectedWorkflow.transitions ?? []).filter(t => t.id !== transition.id);
        }
        this.successMessage = 'Transition removed.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to remove transition.';
        this.cdr.detectChanges();
      },
    });
  }

  activateWorkflow(): void {
    if (!this.selectedWorkflow || !confirm(`Activate "${this.selectedWorkflow.name}"? It will become the active workflow for this project.`)) return;
    this.http.post<any>(`${this.apiUrl}/workflows/${this.selectedWorkflow.id}/activate`, {}).subscribe({
      next: (res) => {
        const updated = res?.data ?? res;
        this.selectedWorkflow = updated;
        this.workflows = this.workflows.map(wf => ({
          ...wf,
          is_active: wf.id === updated.id,
        }));
        this.successMessage = 'Workflow activated.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to activate workflow.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteWorkflow(workflow: WorkflowTemplate): void {
    if (!confirm(`Delete workflow "${workflow.name}"?`)) return;
    this.http.delete<any>(`${this.apiUrl}/workflows/${workflow.id}`).subscribe({
      next: () => {
        this.workflows = this.workflows.filter(wf => wf.id !== workflow.id);
        if (this.selectedWorkflow?.id === workflow.id) this.selectedWorkflow = null;
        this.successMessage = 'Workflow deleted.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Unable to delete workflow.';
        this.cdr.detectChanges();
      },
    });
  }

  getStateName(stateId: number): string {
    return this.selectedWorkflow?.states?.find(s => s.id === stateId)?.name ?? `State #${stateId}`;
  }

  // --- Drag-and-drop state reordering ---
  onStateDragStart(state: WorkflowState): void {
    this.draggedState = state;
  }

  onStateDragEnd(): void {
    this.draggedState = null;
  }

  onStateDrop(target: WorkflowState): void {
    if (!this.selectedWorkflow?.states || !this.draggedState || this.draggedState.id === target.id) {
      this.draggedState = null;
      return;
    }

    const states = [...this.selectedWorkflow.states];
    const fromIndex = states.findIndex(s => s.id === this.draggedState!.id);
    const toIndex = states.findIndex(s => s.id === target.id);
    if (fromIndex < 0 || toIndex < 0) return;

    // Reorder locally (optimistic), then persist new positions.
    const [moved] = states.splice(fromIndex, 1);
    states.splice(toIndex, 0, moved);
    states.forEach((s, i) => (s.position = i + 1));
    this.selectedWorkflow.states = states;
    this.draggedState = null;
    this.cdr.detectChanges();

    this.persistStatePositions(states);
  }

  private persistStatePositions(states: WorkflowState[]): void {
    if (!this.selectedWorkflow) return;
    const workflowId = this.selectedWorkflow.id;

    states.forEach(state => {
      this.http.put<any>(
        `${this.apiUrl}/workflows/${workflowId}/states/${state.id}`,
        { position: state.position }
      ).subscribe({
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Unable to reorder states. Reloading.';
          this.selectWorkflow({ id: workflowId } as WorkflowTemplate);
        }
      });
    });
  }

  goToBoard(): void {
    this.router.navigate(['/projects', this.projectId, 'board']);
  }
}
