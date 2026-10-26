import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    data: {
      department: { type: String, default: '' },
      designation: { type: String, default: '' },
      email: { type: String, default: '' },
      status: { type: String, enum: ['Active', 'On leave', 'Inactive'], default: 'Active' },
    },
  },
  { timestamps: true }
);

export const Employee = mongoose.model('Employee', employeeSchema);
