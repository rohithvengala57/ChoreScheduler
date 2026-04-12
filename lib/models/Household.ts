import mongoose, { Schema, Document, Model } from "mongoose";

export interface HouseholdDoc extends Document {
  name: string;
  code: string;
}

const HouseholdSchema = new Schema<HouseholdDoc>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, length: 6 },
  },
  { timestamps: true }
);

export const Household: Model<HouseholdDoc> =
  mongoose.models.Household ||
  mongoose.model<HouseholdDoc>("Household", HouseholdSchema);
