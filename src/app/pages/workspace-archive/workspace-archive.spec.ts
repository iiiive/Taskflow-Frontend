import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceArchive } from './workspace-archive';

describe('WorkspaceArchive', () => {
  let component: WorkspaceArchive;
  let fixture: ComponentFixture<WorkspaceArchive>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceArchive],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceArchive);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
