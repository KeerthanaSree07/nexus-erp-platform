import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Recorded', 'Pending', 'Approved'], default: 'Recorded' },
    data: {
      category: { type: String, default: '' },
      amount: { type: Number, required: true },
      date: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

expenseSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await mongoose.model('Expense').countDocuments();
    this.code = `EXP-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

export const Expense = mongoose.model('Expense', expenseSchema);
