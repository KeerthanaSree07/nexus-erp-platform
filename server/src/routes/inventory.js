import { Router } from 'express';
import { Product } from '../models/Product.js';
import { Movement } from '../models/Movement.js';

export const inventoryRouter = Router();

// POST /api/inventory/movements
inventoryRouter.post('/movements', async (req, res) => {
  try {
    const { productId, quantity, type, reason } = req.body;
    if (!productId || !quantity || !type || !reason) {
      return res.status(400).json({ message: 'Product, quantity, type, and reason are required.' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const delta = type === 'in' ? Number(quantity) : -Number(quantity);
    const newStock = (product.data.stock || 0) + delta;

    if (newStock < 0) {
      return res.status(400).json({ message: 'Insufficient stock. This movement would make inventory negative.' });
    }

    product.data.stock = newStock;
    await product.save();

    await Movement.create({ productId, quantity: Number(quantity), type, reason });
    res.status(201).json({ message: 'Stock movement recorded.', stock: newStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inventory/movements
inventoryRouter.get('/movements', async (req, res) => {
  try {
    const movements = await Movement.find().sort({ createdAt: -1 }).limit(100).populate('productId', 'name code');
    res.json({ data: movements });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
