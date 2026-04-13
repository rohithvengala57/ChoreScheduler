import mongoose, { Schema } from "mongoose";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "member";
  householdId: string | null;
  status: "active" | "pending";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", default: null },
    status: { type: String, enum: ["active", "pending"], default: "pending" },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
