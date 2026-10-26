import { Router } from 'express';
import { Product } from '../models/Product.js';

export const productsRouter = Router();

// GET /api/products
productsRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { $or: [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }] } : {};
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({ data: products.map(p => ({ id: p._id, code: p.code, name: p.name, data: p.data, createdAt: p.createdAt })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products
productsRouter.post('/', async (req, res) => {
  try {
    const { name, code, data } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'Product name and SKU are required.' });
    const product = await Product.create({ name, code, data });
    res.status(201).json({ data: { id: product._id, name: product.name, code: product.code, data: product.data } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'A product with that SKU already exists.' });
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/products/:id
productsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, code, data } = req.body;
    const update = {};
    if (name) update.name = name;
    if (code) update.code = code;
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        update[`data.${k}`] = v;
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ data: { id: product._id, name: product.name, code: product.code, data: product.data } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/products/:id
productsRouter.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Archived.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
