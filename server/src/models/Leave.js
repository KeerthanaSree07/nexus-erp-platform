import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    name: { type: String, trim: true },        // employee name (denormalized)
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    data: {
      startDate: { type: String, required: true },
      endDate: { type: String, required: true },
      reason: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const Leave = mongoose.model('Leave', leaveSchema);
