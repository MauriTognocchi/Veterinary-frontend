# Veterinary Frontend - Estado del Proyecto

## Stack y arquitectura

- **Framework:** Angular 22.1 (standalone components, signals)
- **Testing:** Vitest + jsdom
- **HTTP:** `HttpClient` con interceptor funcional (`withInterceptors`)
- **Estructura:** `core/` (guards, interceptors, models, services), `features/` (auth, owners, pets), `home/`, `shared/`
- **Backend target:** `http://localhost:8080` (hardcodeado)
- **Sin librería de UI** (solo CSS propio), sin state management, sin environments.

---

## Implementado y funcional

### 1. Autenticación - Login
- **Estado:** COMPLETO (solo login)
- `LoginRequest` / `LoginResponse` (`accessToken`, `refreshToken`)
- `AuthService.login()` consume `POST /api/auth/login` y guarda tokens
- Pantalla de login con Reactive Forms, validaciones, estados de carga y error (401/403)
- Redirección a `/owners` tras login exitoso

### 2. Almacenamiento de tokens
- **Estado:** COMPLETO
- `TokenStorageService` con `sessionStorage`, manejo defensivo de errores
- Expone get/set/clear de access y refresh token

### 3. Interceptor HTTP
- **Estado:** FUNCIONAL (parcial)
- Agrega `Authorization: Bearer <token>` a las requests
- Evita agregar el header en login/refresh

### 4. Owners - Modelos y servicio
- **Estado:** COMPLETO (capa de datos)
- `OwnerRequest` / `OwnerResponse`, `AddressRequest` / `AddressResponse`
- `OwnerService`: `getAll`, `getById`, `getByDni`, `create`, `update`, `delete`

### 5. Owners - Listado
- **Estado:** COMPLETO (solo lectura)
- `OwnerList` consume `GET /api/owners` con signals
- Manejo de loading, error (401/403) y estado vacío
- Tabla con nombre, apellido, DNI, teléfono y email

### 6. Infraestructura base
- **Estado:** COMPLETO
- `app.config.ts` con router, HttpClient e interceptor
- Routing básico: `/login`, `/owners`
- Componentes creados: header, footer, home

---

## Parcial / scaffolding sin lógica

| Elemento | Estado | Detalle |
|---|---|---|
| `authGuard` | STUB | Retorna `true` siempre, no protege rutas |
| `roleGuard` | STUB | Retorna `true` siempre, sin roles/permisos |
| `OwnerForm` | VACÍO | `owner-form.html` es placeholder |
| `OwnerDetail` | VACÍO | `owner-detail.html` es placeholder |
| `PetList` | VACÍO | Componente sin lógica |
| `PetForm` | VACÍO | Componente sin lógica |
| `PetDetail` | VACÍO | Componente sin lógica |
| `PetService` | INVÁLIDO | Usa decorador inexistente `@Service`, clase vacía |
| `Header` / `Footer` / `Home` | VACÍOS | Solo placeholders, no usados en el shell |
| `app.html` | MÍNIMO | Solo `<router-outlet />`, sin layout |
| Tests | SCAFFOLD | Specs por defecto; `auth.spec.ts` importa `Auth` (no existe) |

---

## Faltante: features del backend sin frontend

De los 20 features que expone el backend, el frontend solo cubre **auth (login)** y **owners (solo listar)**. Falta todo lo demás:

### Catálogos
- [ ] AnimalType (tipos de animales)
- [ ] Breed (razas)
- [ ] Condition (condiciones médicas)
- [ ] Medication (medicamentos)
- [ ] Study (estudios médicos)

### Organización y personal
- [ ] Branch (sucursales)
- [ ] Veterinarian (veterinarios)
- [ ] Receptionist (recepcionistas)
- [ ] User (usuarios del sistema)

### Propietarios y mascotas
- [x] Owners: modelos + servicio + listado
- [ ] Owners: formulario, detalle, edición, eliminación, búsqueda por DNI
- [ ] Pets: modelos, servicio, listado, formulario, detalle, historial, `/my`
- [ ] OwnerByPet (asociación propietario-mascota)

### Operación clínica
- [ ] Appointment (turnos): CRUD, confirmar, slots disponibles
- [ ] Visit (visitas): desde turno y walk-in, historial médico
- [ ] Diagnosis (diagnósticos)
- [ ] Prescription (prescripciones)
- [ ] ConditionByPet
- [ ] DiagnosisByStudy
- [ ] StudyByVisit

### Autenticación avanzada
- [ ] Registro (`POST /api/auth/register`)
- [ ] Refresh token (`POST /api/auth/refresh-token`)
- [ ] Logout con UI / header
- [ ] Decodificación de JWT (rol y permisos)
- [ ] Guards reales aplicados a rutas
- [ ] Redirección a login si no está autenticado
- [ ] Ocultar/mostrar acciones según rol y permisos

---

## Deuda técnica y bugs detectados

1. **`PetService` inválido:** `@Service()` no existe en Angular; la clase `Pet` está vacía (`features/pets/services/pet.ts:1`). Romperá el build.
2. **`auth.spec.ts` importa `Auth`** desde `./auth`, pero la clase se llama `AuthService` (`core/services/auth.spec.ts:3`).
3. **Guards no implementados:** `authGuard` y `roleGuard` retornan `true` sin lógica (`core/guards/*.ts`).
4. **Guards no aplicados:** ninguna ruta usa `canActivate`.
5. **Rutas incompletas:** sin ruta default, sin wildcard/404, sin layout, sin rutas de pets ni formularios/detalles.
6. **URL base hardcodeada y duplicada** en `AuthService`, `OwnerService` e interceptor; debería estar en environments/config.
7. **Mismatch de refresh:** el interceptor referencia `/api/auth/refresh`, el backend expone `/api/auth/refresh-token`, y no hay lógica de refresh.
8. **Tokens en `sessionStorage`:** se pierden al cerrar pestaña (validar si es intencional).
9. **Sin interceptor de errores global** ni manejo centralizado de 401/403/timeouts.
10. **Sin estado de sesión compartido:** no hay signal observable de usuario autenticado.
11. **Sin tests reales:** solo scaffolds autogenerados.
12. **Header/Footer/Home no integrados** al shell de la app.
13. **Sin modelos para el resto de entidades del backend.**

---

## Resumen de cobertura vs Backend

| Área | Backend | Frontend |
|---|---|---|
| Autenticación | Login, register, refresh | Solo login |
| Owners | CRUD + búsqueda DNI | Modelos + listado |
| Pets | CRUD + `/my` + historial | Nada |
| Sucursales/Personal | CRUD completo | Nada |
| Catálogos (5) | CRUD completo | Nada |
| Turnos | CRUD + confirm + available | Nada |
| Clínica (visitas/diag/prescripciones) | Completo | Nada |
| Asociaciones (5) | Completo | Nada |
| Reportes/notificaciones | No existen | No aplica |

**Cobertura estimada del frontend: ~10%** de los features del backend (auth parcial + owners lectura).

---

## Roadmap sugerido

1. **Fase 1 - Base sólida:** corregir `PetService`, specs, guards reales, environments, interceptor de errores, layout con header/footer y rutas protegidas.
2. **Fase 2 - Owners completo:** formulario, detalle, edición, borrado, búsqueda por DNI y navegación.
3. **Fase 3 - Pets:** modelos, servicio, CRUD, historial y `/my`.
4. **Fase 4 - Catálogos y personal:** AnimalType, Breed, Condition, Medication, Study, Branch, Veterinarian, Receptionist.
5. **Fase 5 - Operación:** Turnos (incluye `available`/`confirm`), Visitas, Diagnósticos, Prescripciones, asociaciones y usuarios.
