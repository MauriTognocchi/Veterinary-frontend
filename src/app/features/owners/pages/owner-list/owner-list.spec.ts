import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { OwnerResponse } from '../../models/owner.model';
import { OwnerService } from '../../services/owner';
import { OwnerList } from './owner-list';

describe('OwnerList', () => {
  let component: OwnerList;
  let fixture: ComponentFixture<OwnerList>;
  let ownerService: { getAll: ReturnType<typeof vi.fn> };
  let authService: { hasAnyPermission: ReturnType<typeof vi.fn> };

  const owner: OwnerResponse = {
    externalId: 'owner-1',
    firstName: 'Ana',
    lastName: 'Gómez',
    phone: '11 5555-1234',
    email: 'ana@example.com',
    dni: '30123456',
    address: null,
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(OwnerList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    ownerService = { getAll: vi.fn().mockReturnValue(of([owner])) };
    authService = { hasAnyPermission: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [OwnerList],
      providers: [
        provideRouter([]),
        { provide: OwnerService, useValue: ownerService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('muestra Nuevo propietario con CREATE_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('CREATE_OWNERS'),
    );

    createComponent();

    const link = fixture.nativeElement.querySelector(
      '.owner-list-header a',
    ) as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('Nuevo propietario');
    expect(link?.getAttribute('href')).toBe('/owners/new');
  });

  it('oculta Nuevo propietario sin CREATE_OWNERS', () => {
    createComponent();

    expect(fixture.nativeElement.querySelector('.owner-list-header a')).toBeNull();
  });

  it('muestra Eliminar con DELETE_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('DELETE_OWNERS'),
    );

    createComponent();

    const buttons = fixture.nativeElement.querySelectorAll(
      '.actions-cell button',
    );
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent?.trim()).toBe('Eliminar');
  });

  it('oculta Eliminar sin DELETE_OWNERS', () => {
    createComponent();

    expect(fixture.nativeElement.querySelector('.actions-cell button')).toBeNull();
  });
});
