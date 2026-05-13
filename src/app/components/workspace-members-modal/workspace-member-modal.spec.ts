import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceMemberModal } from './workspace-member-modal';

describe('WorkspaceMemberModal', () => {
  let component: WorkspaceMemberModal;
  let fixture: ComponentFixture<WorkspaceMemberModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceMemberModal],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceMemberModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
