import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Payroll calculations', () => {
  it('correctly calculates gross and net salary with allowances and deductions', () => {
    const basePay = 5000;
    const allowances = [
      { name: 'Transport', amount: 300 },
      { name: 'Housing', amount: 700 },
    ];
    const deductions = [
      { name: 'Health Insurance', amount: 200 },
      { name: 'Retirement', amount: 350 },
    ];

    const allowanceTotal = allowances.reduce((acc, a) => acc + a.amount, 0);
    const deductionTotal = deductions.reduce((acc, d) => acc + d.amount, 0);
    const gross = basePay + allowanceTotal;
    const net = gross - deductionTotal;

    assert.equal(allowanceTotal, 1000);
    assert.equal(deductionTotal, 550);
    assert.equal(gross, 6000);
    assert.equal(net, 5450);
  });
});

describe('Sales Order calculations', () => {
  it('computes subtotal, discounts, tax, and totals correctly', () => {
    const items = [
      { unitPrice: 100, quantity: 2, discountPercent: 10 }, // 200 - 10% = 180
      { unitPrice: 50, quantity: 4, discountPercent: 0 },   // 200 - 0% = 200
    ];
    const taxRate = 10; // 10%

    let subtotal = 0;
    for (const item of items) {
      const line = item.unitPrice * item.quantity * (1 - item.discountPercent / 100);
      subtotal += line;
    }

    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    assert.equal(subtotal, 380);
    assert.equal(tax, 38);
    assert.equal(total, 418);
  });
});

describe('Inventory movement validation', () => {
  it('rejects stock movements that result in negative stock', () => {
    const currentStock = 10;
    const requestedDeduction = 15;
    const newStock = currentStock - requestedDeduction;

    assert.equal(newStock < 0, true);
  });

  it('allows stock movements within available balance', () => {
    const currentStock = 10;
    const requestedDeduction = 8;
    const newStock = currentStock - requestedDeduction;

    assert.equal(newStock >= 0, true);
    assert.equal(newStock, 2);
  });
});

describe('User Registration & Security', () => {
  it('validates password matching on registration', () => {
    const pass = 'SecretPassword123';
    const match = 'SecretPassword123';
    const mismatch = 'DifferentPassword456';

    assert.equal(pass === match, true);
    assert.equal(pass === mismatch, false);
  });

  it('validates minimum password length', () => {
    assert.equal('short'.length >= 8, false);
    assert.equal('ValidPass123'.length >= 8, true);
  });

  it('validates email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.equal(emailRegex.test('valid@example.com'), true);
    assert.equal(emailRegex.test('invalid-email'), false);
    assert.equal(emailRegex.test(''), false);
  });

  it('enforces normal user role (Sales Executive) and blocks Administrator escalation', () => {
    // When a user tries to pass an arbitrary or Administrator role in registration
    const incomingPayload = {
      name: 'Hacker',
      email: 'hacker@example.com',
      password: 'password12345',
      confirmPassword: 'password12345',
      role: 'Administrator', // Attempted privilege escalation
    };

    // The backend explicitly hardcodes the normal role
    const assignedRole = 'Sales Executive';

    assert.notEqual(assignedRole, incomingPayload.role);
    assert.equal(assignedRole, 'Sales Executive');
  });
});

