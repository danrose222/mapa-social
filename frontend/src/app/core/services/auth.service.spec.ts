import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('clears the cached user when getMe fails', () => {
    service.setUser({ id: 1, email: 'test@example.com' });

    service.getMe().subscribe({
      next: () => fail('Expected an unauthorized error'),
      error: () => undefined,
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.getUser()).toBeNull();
  });
});
