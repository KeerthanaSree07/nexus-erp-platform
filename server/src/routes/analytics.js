import { Router } from 'express';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Purchase } from '../models/Purchase.js';
import { Employee } from '../models/Employee.js';
import { Expense } from '../models/Expense.js';
import { Invoice } from '../models/Invoice.js';

export const analyticsRouter = Router();

// GET /api/analytics/summary — Dashboard KPI cards and widgets
analyticsRouter.get('/summary', async (_req, res) => {
  try {
    const [orders, products, purchases, employees, expenses, invoices] = await Promise.all([
      Order.find().sort({ createdAt: -1 }),
      Product.find(),
      Purchase.find(),
      Employee.find(),
      Expense.find(),
      Invoice.find(),
    ]);

    // Revenue from fulfilled orders/invoices
    const revenue = invoices.reduce((acc, inv) => acc + (Number(inv.data?.total) || 0), 0);

    const productCount = products.length;
    let inventoryValue = 0;
    const lowStockItems = [];

    for (const p of products) {
      const stock = Number(p.data?.stock) || 0;
      const cost = Number(p.data?.costPrice) || 0;
      const reorder = Number(p.data?.reorderLevel) || 0;
      inventoryValue += stock * cost;
      if (stock <= reorder) {
        lowStockItems.push({
          id: p._id,
          name: p.name,
          code: p.code,
          data: { stock },
        });
      }
    }

    const pendingPurchases = purchases.filter(po => po.status === 'Pending').length;
    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.data?.amount) || 0), 0);

    const recentOrders = orders.slice(0, 5).map(o => ({
      id: o._id,
      code: o.code,
      name: o.name,
      status: o.status,
      data: { total: o.data?.total || 0 },
    }));

    res.json({
      data: {
        revenue,
        orderCount: orders.length,
        productCount,
        inventoryValue,
        lowStock: lowStockItems.length,
        pendingPurchases,
        employeeCount: employees.length,
        expenses: totalExpenses,
        lowStockItems: lowStockItems.slice(0, 5),
        recentOrders,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/sales — Sales invoices report
analyticsRouter.get('/sales', async (_req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    const total = invoices.reduce((acc, inv) => acc + (Number(inv.data?.total) || 0), 0);
    res.json({
      total,
      data: invoices.map(i => ({
        id: i._id,
        code: i.code,
        name: i.name,
        status: i.status,
        data: i.data,
        createdAt: i.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/inventory — Inventory valuation and alert stats
analyticsRouter.get('/inventory', async (_req, res) => {
  try {
    const products = await Product.find();
    let inventoryValue = 0;
    let lowStock = 0;

    for (const p of products) {
      const stock = Number(p.data?.stock) || 0;
      const cost = Number(p.data?.costPrice) || 0;
      const reorder = Number(p.data?.reorderLevel) || 0;
      inventoryValue += stock * cost;
      if (stock <= reorder) lowStock++;
    }

    res.json({ inventoryValue, lowStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/finance — Finance report breakdown
analyticsRouter.get('/finance', async (_req, res) => {
  try {
    const [invoices, expenses] = await Promise.all([Invoice.find(), Expense.find()]);
    const revenue = invoices.reduce((acc, inv) => acc + (Number(inv.data?.total) || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.data?.amount) || 0), 0);

    res.json({
      data: {
        revenue,
        expenses: totalExpenses,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
