import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceBacklog } from './workspace-backlog';

describe('WorkspaceBacklog', () => {
  let component: WorkspaceBacklog;
  let fixture: ComponentFixture<WorkspaceBacklog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceBacklog],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceBacklog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
