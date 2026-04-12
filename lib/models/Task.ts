import mongoose, { Schema, Document, Model } from "mongoose";
import type { TimeOfDay } from "../types";

export interface TaskDoc extends Document {
  name: string;
  householdId: mongoose.Types.ObjectId;
  weight: number;
  frequency: number;
  timeOfDay: TimeOfDay;
}

const TaskSchema = new Schema<TaskDoc>(
  {
    name: { type: String, required: true, trim: true },
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
    weight: { type: Number, required: true, min: 0.1, default: 1 },
    frequency: { type: Number, required: true, min: 1, max: 7, default: 7 },
    timeOfDay: {
      type: String,
      enum: ["morning", "afternoon", "evening", "any"],
      default: "any",
    },
  },
  { timestamps: true }
);

export const Task: Model<TaskDoc> =
  mongoose.models.Task ||
  mongoose.model<TaskDoc>("Task", TaskSchema);
