import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceBoard } from './workspace-board';

describe('WorkspaceBoard', () => {
  let component: WorkspaceBoard;
  let fixture: ComponentFixture<WorkspaceBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceBoard],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceBoard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
