import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PatientBadgeComponent } from './patient-badge.component';

describe('PatientBadgeComponent', () => {
  let fixture: ComponentFixture<PatientBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientBadgeComponent);
  });

  it('should display uniqueCode and distinguish CANINO species visually', () => {
    fixture.componentRef.setInput('uniqueCode', 'HUV-2026-0001');
    fixture.componentRef.setInput('name', 'Max');
    fixture.componentRef.setInput('species', 'CANINO');
    fixture.componentRef.setInput('ownerName', 'Laura Gómez');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="patient-unique-code"]')?.textContent?.trim()).toBe('HUV-2026-0001');
    expect(el.querySelector('[data-testid="patient-name"]')?.textContent?.trim()).toBe('Max');
    expect(el.querySelector('[data-testid="patient-owner"]')?.textContent).toContain('Laura Gómez');
    expect(el.querySelector('[data-testid="patient-badge"]')?.className).toContain('bg-sky-50');
  });

  it('should distinguish FELINO species with amber styling', () => {
    fixture.componentRef.setInput('uniqueCode', 'HUV-2026-0002');
    fixture.componentRef.setInput('name', 'Max');
    fixture.componentRef.setInput('species', 'FELINO');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="patient-badge"]')?.className).toContain('bg-amber-50');
  });

  it('should hide ownerName when compact mode is enabled', () => {
    fixture.componentRef.setInput('uniqueCode', 'HUV-2026-0003');
    fixture.componentRef.setInput('name', 'Rocky');
    fixture.componentRef.setInput('species', 'CANINO');
    fixture.componentRef.setInput('ownerName', 'Andrés Ruiz');
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="patient-owner"]')).toBeNull();
  });
});
