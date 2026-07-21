import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NecesidadForm } from './necesidad-form';

describe('NecesidadForm', () => {
  let component: NecesidadForm;
  let fixture: ComponentFixture<NecesidadForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NecesidadForm],
    }).compileComponents();

    fixture = TestBed.createComponent(NecesidadForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
