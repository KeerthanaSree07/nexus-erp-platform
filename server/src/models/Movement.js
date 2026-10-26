import mongoose from 'mongoose';

const movementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    type: { type: String, enum: ['in', 'out'], required: true },
    reason: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const Movement = mongoose.model('Movement', movementSchema);
