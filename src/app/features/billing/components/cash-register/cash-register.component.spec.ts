import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { CashRegisterComponent } from './cash-register.component';
import { CashRegisterService } from '../../services/cash-register.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CashRegisterComponent', () => {
  let fixture: ComponentFixture<CashRegisterComponent>;
  let component: CashRegisterComponent;
  let cashService: CashRegisterService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashRegisterComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    cashService = TestBed.inject(CashRegisterService);
    vi.spyOn(cashService, 'getCurrentSession').mockReturnValue(of(null));

    fixture = TestBed.createComponent(CashRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render opening card when register is closed', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="cash-open-card"]')).toBeTruthy();
  });

  it('should calculate physical denomination count and discrepancy difference accurately', () => {
    cashService.currentSession.set({
      id: 'c-1',
      status: 'ABIERTA',
      openingAmount: 200000,
      openedAt: '2026-11-19T08:00:00Z',
      openedBy: 'Dr. Roberto Mendoza'
    });
    fixture.detectChanges();

    component.openClosingModal();
    component.updateDenomination(100000, '1'); // 100,000
    component.updateDenomination(50000, '1');  //  50,000
    component.updateDenomination(20000, '2');  //  40,000 -> Total 190,000 (-10,000 diff)
    fixture.detectChanges();

    expect(component.physicalCount()).toBe(190000);
    expect(component.closingEvaluation().difference).toBe(-10000);
    expect(component.closingEvaluation().isBalanced).toBe(false);
  });
});
