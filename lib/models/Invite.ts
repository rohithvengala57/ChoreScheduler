import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvite extends Document {
  email: string;
  householdId: mongoose.Types.ObjectId;
  role: "member";
  status: "pending" | "accepted" | "approved" | "rejected";
  token: string;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    role: { type: String, enum: ["member"], default: "member" },
    status: { type: String, enum: ["pending", "accepted", "approved", "rejected"], default: "pending" },
    token: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const Invite: Model<IInvite> =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);
