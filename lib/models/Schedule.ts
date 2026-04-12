import mongoose, { Schema, Document, Model } from "mongoose";
import type { DayOfWeek } from "../types";

export interface AssignmentSubDoc {
  day: DayOfWeek;
  personId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
}

export interface EffortSubDoc {
  personId: mongoose.Types.ObjectId;
  points: number;
}

export interface ScheduleDoc extends Document {
  householdId: mongoose.Types.ObjectId;
  weekStart: Date;
  assignments: AssignmentSubDoc[];
  effortPoints: EffortSubDoc[];
  feasible: boolean;
  warnings: string[];
  generatedAt: Date;
  isManuallyEdited: boolean;
}

const AssignmentSchema = new Schema<AssignmentSubDoc>(
  {
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
  },
  { _id: false }
);

const ScheduleSchema = new Schema<ScheduleDoc>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true, index: true },
    weekStart: { type: Date, required: true },
    assignments: [AssignmentSchema],
    effortPoints: [
      {
        personId: { type: Schema.Types.ObjectId, ref: "Person" },
        points: { type: Number, default: 0 },
        _id: false,
      },
    ],
    feasible: { type: Boolean, default: true },
    warnings: [{ type: String }],
    generatedAt: { type: Date, default: Date.now },
    isManuallyEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Schedule: Model<ScheduleDoc> =
  mongoose.models.Schedule ||
  mongoose.model<ScheduleDoc>("Schedule", ScheduleSchema);
