import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { HasRoleDirective } from './has-role.directive';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, HasRoleDirective],
  template: `
    <button id="admin-action" *hasRole="'ADMIN'">Eliminar Historia Clínica</button>
    <div id="vet-data" *hasRole="['ADMIN', 'VETERINARIO']">Evolución Médica Reservada</div>
    <span id="rec-action" *hasRole="'RECEPCIONISTA'">Terminal de Cobro</span>
  `
})
class TestHostComponent {}

describe('HasRoleDirective (*hasRole)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let authService: AuthService;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [AuthService]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(TestHostComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    authService.clearSession();
  });

  it('debe remover del DOM todas las acciones reservadas si el usuario no tiene sesión', () => {
    authService.clearSession();
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).toBeNull();
    expect(element.querySelector('#vet-data')).toBeNull();
    expect(element.querySelector('#rec-action')).toBeNull();
  });

  it('debe renderizar únicamente elementos permitidos para ADMIN', () => {
    authService.setMockSession('ADMIN', 'Roberto Admin');
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).not.toBeNull();
    expect(element.querySelector('#vet-data')).not.toBeNull();
    expect(element.querySelector('#rec-action')).toBeNull();
  });

  it('debe renderizar elementos clínicos y ocultar administrativos para VETERINARIO', () => {
    authService.setMockSession('VETERINARIO', 'Dra. Camila');
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).toBeNull();
    expect(element.querySelector('#vet-data')).not.toBeNull();
    expect(element.querySelector('#rec-action')).toBeNull();
  });

  it('debe renderizar únicamente elementos de recepción y ocultar los clínicos para RECEPCIONISTA', () => {
    authService.setMockSession('RECEPCIONISTA', 'Carlos Recepción');
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).toBeNull();
    expect(element.querySelector('#vet-data')).toBeNull();
    expect(element.querySelector('#rec-action')).not.toBeNull();
  });

  it('debe actualizar reactivamente el DOM cuando el rol del usuario cambia dinámicamente', () => {
    // Inicialmente como RECEPCIONISTA
    authService.setMockSession('RECEPCIONISTA', 'Carlos');
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).toBeNull();
    expect(element.querySelector('#rec-action')).not.toBeNull();

    // Cambio dinámico a ADMIN
    authService.setMockSession('ADMIN', 'Roberto Admin');
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).not.toBeNull();
    expect(element.querySelector('#rec-action')).toBeNull();

    // Cierre de sesión reactivo
    authService.clearSession();
    fixture.detectChanges();

    expect(element.querySelector('#admin-action')).toBeNull();
    expect(element.querySelector('#vet-data')).toBeNull();
    expect(element.querySelector('#rec-action')).toBeNull();
  });
});
