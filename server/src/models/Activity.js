import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },    // action description
    entity: { type: String, default: '' },     // entity type
    entityId: { type: String, default: '' },
    actor: { type: String, default: '' },      // user who performed the action
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Activity = mongoose.model('Activity', activitySchema);
