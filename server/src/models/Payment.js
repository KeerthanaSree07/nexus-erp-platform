import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, trim: true },
    name: { type: String, default: 'Customer payment', trim: true },
    status: { type: String, default: 'Recorded' },
    type: { type: String, default: 'Payment' },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    idempotencyKey: { type: String, unique: true, sparse: true },
    data: {
      amount: { type: Number, required: true },
      method: { type: String, default: 'Bank transfer' },
      reference: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await mongoose.model('Payment').countDocuments();
    this.code = `PAY-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const Payment = mongoose.model('Payment', paymentSchema);
