import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, trim: true },
    name: { type: String, trim: true },        // customer name (denormalized)
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    status: { type: String, default: 'Issued' },
    data: {
      items: { type: Array, default: [] },
      total: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

invoiceSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.code = `INV-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const Invoice = mongoose.model('Invoice', invoiceSchema);
