import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const mediaSchema = new Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    bytes: { type: Number, required: true }
  },
  { _id: false }
);

const aiVerdictSchema = new Schema(
  {
    valid: Boolean,
    confidence: Number,
    proposedImpact: Number,
    reasoning: String,
    categoryTags: [String],
    abuseFlags: [String],
    analyzedAt: Date
  },
  { _id: false }
);

const reportSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    anonymousTag: { type: String, required: true },
    type: { type: String, enum: ['positive', 'negative'], required: true },
    description: { type: String, required: true, maxlength: 500 },
    feelings: { type: String, required: true, maxlength: 500 },
    media: { type: mediaSchema, required: true },
    status: {
      type: String,
      enum: ['pending_ai', 'ai_reviewed', 'approved', 'rejected', 'flagged'],
      default: 'pending_ai',
      required: true
    },
    aiVerdict: { type: aiVerdictSchema, default: null },
    adminDecision: {
      type: {
        adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        verdict: { type: String, enum: ['approved', 'rejected'], required: true },
        finalImpact: { type: Number, required: true },
        note: { type: String, default: '' },
        decidedAt: { type: Date, default: Date.now }
      },
      default: null
    }
  },
  { timestamps: true }
);

reportSchema.index({ accountId: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: 1 });

export type ReportDocument = InferSchemaType<typeof reportSchema>;
export const Report: Model<ReportDocument> =
  mongoose.models.Report ?? mongoose.model<ReportDocument>('Report', reportSchema);
