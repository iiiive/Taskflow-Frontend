import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceTimesheet } from './workspace-timesheet';

describe('WorkspaceTimesheet', () => {
  let component: WorkspaceTimesheet;
  let fixture: ComponentFixture<WorkspaceTimesheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceTimesheet],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceTimesheet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
