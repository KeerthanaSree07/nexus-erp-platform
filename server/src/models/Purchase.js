import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: String,
    orderedQuantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, trim: true },
    name: { type: String, trim: true },                 // vendor name (denormalized)
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    status: {
      type: String,
      enum: ['Pending', 'Awaiting approval', 'Approved', 'Partially received', 'Received', 'Cancelled'],
      default: 'Pending',
    },
    data: {
      items: [purchaseItemSchema],
      total: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

purchaseSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await mongoose.model('Purchase').countDocuments();
    this.code = `PO-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const Purchase = mongoose.model('Purchase', purchaseSchema);
