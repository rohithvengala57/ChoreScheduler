import mongoose, { Schema, Document, Model } from "mongoose";

export interface PersonDoc extends Document {
  name: string;
  householdId: mongoose.Types.ObjectId;
  color: string;
}

const PersonSchema = new Schema<PersonDoc>(
  {
    name: { type: String, required: true, trim: true },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
    color: { type: String, required: true, default: "#6366f1" },
  },
  { timestamps: true }
);

export const Person: Model<PersonDoc> =
  mongoose.models.Person ||
  mongoose.model<PersonDoc>("Person", PersonSchema);
