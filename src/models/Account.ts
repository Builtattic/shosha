import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const breakdownSchema = new Schema(
  {
    authenticity: { type: Number, default: 60, min: 0, max: 100 },
    engagement: { type: Number, default: 60, min: 0, max: 100 },
    community: { type: Number, default: 60, min: 0, max: 100 },
    content: { type: Number, default: 60, min: 0, max: 100 },
    impact: { type: Number, default: 60, min: 0, max: 100 }
  },
  { _id: false }
);

const accountSchema = new Schema(
  {
    platform: { type: String, enum: ['x', 'instagram'], required: true },
    username: { type: String, required: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    followers: { type: String, default: '0' },
    score: { type: Number, default: 60, min: 0, max: 100 },
    scoreHistory: [
      {
        t: { type: Date, default: Date.now },
        s: { type: Number, required: true },
        cause: { type: String, enum: ['seed', 'report', 'audit', 'decay'], required: true }
      }
    ],
    breakdown: { type: breakdownSchema, default: () => ({}) },
    posts: [
      {
        externalId: String,
        content: String,
        likes: String,
        replies: String,
        mediaUrl: String,
        capturedAt: Date
      }
    ],
    claimed: { type: Boolean, default: false },
    claimedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

accountSchema.index({ platform: 1, username: 1 }, { unique: true });
accountSchema.index({ username: 'text', displayName: 'text', bio: 'text' });

export type AccountDocument = InferSchemaType<typeof accountSchema>;
export const Account: Model<AccountDocument> =
  mongoose.models.Account ?? mongoose.model<AccountDocument>('Account', accountSchema);
