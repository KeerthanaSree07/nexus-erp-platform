import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, trim: true },
    name: { type: String, trim: true },                 // customer name (denormalized)
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    status: {
      type: String,
      enum: ['Draft', 'Confirmed', 'Fulfilled', 'Cancelled'],
      default: 'Draft',
    },
    data: {
      items: [orderItemSchema],
      subtotal: { type: Number, default: 0 },
      taxRate: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      invoiceCode: String,
    },
  },
  { timestamps: true }
);

// Auto-generate order code
orderSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await mongoose.model('Order').countDocuments();
    this.code = `SO-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const Order = mongoose.model('Order', orderSchema);
