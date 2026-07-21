import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecursoForm } from './recurso-form';

describe('RecursoForm', () => {
  let component: RecursoForm;
  let fixture: ComponentFixture<RecursoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecursoForm],
    }).compileComponents();

    fixture = TestBed.createComponent(RecursoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
