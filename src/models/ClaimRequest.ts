import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const claimRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    proofType: { type: String, enum: ['bio_code', 'dm_screenshot', 'oauth'], required: true },
    proofPayload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

export type ClaimRequestDocument = InferSchemaType<typeof claimRequestSchema>;
export const ClaimRequest: Model<ClaimRequestDocument> =
  mongoose.models.ClaimRequest ??
  mongoose.model<ClaimRequestDocument>('ClaimRequest', claimRequestSchema);
