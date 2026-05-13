import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Workspaces } from './workspaces';

describe('Workspaces', () => {
  let component: Workspaces;
  let fixture: ComponentFixture<Workspaces>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Workspaces],
    }).compileComponents();

    fixture = TestBed.createComponent(Workspaces);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
