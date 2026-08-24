import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardOrganizacion } from './dashboard-organizacion';

describe('DashboardOrganizacion', () => {
  let component: DashboardOrganizacion;
  let fixture: ComponentFixture<DashboardOrganizacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardOrganizacion],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardOrganizacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
