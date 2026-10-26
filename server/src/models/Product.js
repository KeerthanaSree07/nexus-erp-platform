import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    data: {
      category: { type: String, default: '' },
      stock: { type: Number, default: 0 },
      reorderLevel: { type: Number, default: 0 },
      costPrice: { type: Number, default: 0 },
      sellingPrice: { type: Number, default: 0 },
      unit: { type: String, default: 'pcs' },
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model('Product', productSchema);
