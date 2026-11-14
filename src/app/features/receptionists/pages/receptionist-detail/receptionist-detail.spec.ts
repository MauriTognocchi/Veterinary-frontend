import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { ReceptionistService } from '../../services/receptionist';
import { ReceptionistDetail } from './receptionist-detail';

describe('ReceptionistDetail', () => {
  let component: ReceptionistDetail;
  let fixture: ComponentFixture<ReceptionistDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReceptionistDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('ReceptionistDetail con respuesta pública', () => {
  it('abre la URL de un recepcionista ajeno sin campos administrativos', async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ externalId: 'rec-1' }) } } },
        { provide: ReceptionistService, useValue: { getById: () => of({ externalId: 'rec-1', firstName: 'Ana', lastName: 'García' }) } },
        { provide: AuthService, useValue: { hasAnyRole: () => false, hasRole: () => true } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReceptionistDetail);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).not.toContain('Teléfono');
    expect(fixture.nativeElement.textContent).not.toContain('Sucursal');
    expect(fixture.nativeElement.querySelector('.status-badge')).toBeNull();
  });

  it('reconoce el detalle propio por el formato completo sin comparar email', async () => {
    await TestBed.configureTestingModule({
      imports: [ReceptionistDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ externalId: 'rec-1' }) } } },
        { provide: ReceptionistService, useValue: { getById: () => of({ externalId: 'rec-1', firstName: 'Ana', lastName: 'García', phone: '123', active: true, branch: null }) } },
        { provide: AuthService, useValue: { hasAnyRole: () => false, hasRole: () => true } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ReceptionistDetail);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('123');
    expect(fixture.nativeElement.querySelector('.status-badge')).toBeNull();
  });
});
