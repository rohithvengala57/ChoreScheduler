import mongoose, { Schema, Document, Model } from "mongoose";
import type { ConstraintType, DayOfWeek } from "../types";

export interface ConstraintDoc extends Document {
  householdId: mongoose.Types.ObjectId;
  type: ConstraintType;
  personId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  day?: DayOfWeek;
  value?: number;
  note?: string;
}

const ConstraintSchema = new Schema<ConstraintDoc>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
    type: {
      type: String,
      enum: ["fixed", "restriction", "preference", "frequency", "day_off"],
      required: true,
    },
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    },
    value: { type: Number },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Constraint: Model<ConstraintDoc> =
  mongoose.models.Constraint ||
  mongoose.model<ConstraintDoc>("Constraint", ConstraintSchema);
