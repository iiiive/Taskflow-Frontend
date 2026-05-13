import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceActivity } from './workspace-activity';

describe('WorkspaceActivity', () => {
  let component: WorkspaceActivity;
  let fixture: ComponentFixture<WorkspaceActivity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceActivity],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceActivity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
