import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { OwnerByPetService } from '../../../owners-by-pets/services/owner-by-pet';
import { OwnerResponse } from '../../models/owner.model';
import { OwnerService } from '../../services/owner';
import { OwnerDetail } from './owner-detail';

describe('OwnerDetail', () => {
  let component: OwnerDetail;
  let fixture: ComponentFixture<OwnerDetail>;
  let ownerService: { getById: ReturnType<typeof vi.fn> };
  let ownerByPetService: { getAll: ReturnType<typeof vi.fn> };
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
    fixture = TestBed.createComponent(OwnerDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function findActionLink(label: string): HTMLAnchorElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.owner-detail-actions a'),
    );

    return links.find((link) => link.textContent?.trim() === label);
  }

  function findActionButton(label: string): HTMLButtonElement | undefined {
    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.owner-detail-actions button'),
    );

    return buttons.find((button) => button.textContent?.trim() === label);
  }

  beforeEach(async () => {
    ownerService = { getById: vi.fn().mockReturnValue(of(owner)) };
    ownerByPetService = { getAll: vi.fn().mockReturnValue(of([])) };
    authService = { hasAnyPermission: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [OwnerDetail],
      providers: [
        provideRouter([]),
        { provide: OwnerService, useValue: ownerService },
        { provide: OwnerByPetService, useValue: ownerByPetService },
        { provide: AuthService, useValue: authService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ externalId: 'owner-1' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('se crea correctamente', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('muestra Editar con UPDATE_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('UPDATE_OWNERS'),
    );

    createComponent();

    expect(findActionLink('Editar')?.getAttribute('href')).toBe(
      '/owners/owner-1/edit',
    );
  });

  it('oculta Editar sin UPDATE_OWNERS', () => {
    createComponent();

    expect(findActionLink('Editar')).toBeUndefined();
  });

  it('muestra Eliminar con DELETE_OWNERS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('DELETE_OWNERS'),
    );

    createComponent();

    expect(findActionButton('Eliminar')).toBeDefined();
  });

  it('oculta Eliminar sin DELETE_OWNERS', () => {
    createComponent();

    expect(findActionButton('Eliminar')).toBeUndefined();
  });

  it('muestra Agregar mascota con CREATE_PETS', () => {
    authService.hasAnyPermission.mockImplementation((permissions: string[]) =>
      permissions.includes('CREATE_PETS'),
    );

    createComponent();

    const element = fixture.nativeElement as HTMLElement;
    const link = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.pets-section-header a'),
    ).find((item) => item.textContent?.includes('Agregar mascota'));

    expect(link?.getAttribute('href')).toBe('/pets/new?ownerId=owner-1');
  });

  it('oculta Agregar mascota sin CREATE_PETS', () => {
    createComponent();

    const element = fixture.nativeElement as HTMLElement;
    const link = Array.from(
      element.querySelectorAll<HTMLAnchorElement>('.pets-section-header a'),
    ).find((item) => item.textContent?.includes('Agregar mascota'));

    expect(link).toBeUndefined();
  });
});
