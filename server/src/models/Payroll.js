import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    name: { type: String, trim: true },        // employee name (denormalized)
    status: { type: String, default: 'Recorded' },
    data: {
      period: { type: String, required: true },
      basePay: { type: Number, required: true },
      allowances: [{ name: String, amount: Number }],
      deductions: [{ name: String, amount: Number }],
      allowanceTotal: { type: Number, default: 0 },
      deductionTotal: { type: Number, default: 0 },
      gross: { type: Number, default: 0 },
      net: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Payroll = mongoose.model('Payroll', payrollSchema);
