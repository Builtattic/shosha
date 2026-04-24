import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const auditRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }
  },
  { timestamps: true }
);

export type AuditRequestDocument = InferSchemaType<typeof auditRequestSchema>;
export const AuditRequest: Model<AuditRequestDocument> =
  mongoose.models.AuditRequest ??
  mongoose.model<AuditRequestDocument>('AuditRequest', auditRequestSchema);
