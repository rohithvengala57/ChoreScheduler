import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITaskLog extends Document {
  householdId: mongoose.Types.ObjectId;
  date: Date;
  taskId: mongoose.Types.ObjectId;
  taskName: string;
  assignedTo: mongoose.Types.ObjectId;
  completed: boolean;
  completedBy: mongoose.Types.ObjectId | null;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskLogSchema = new Schema<ITaskLog>(
  {
    householdId: { type: Schema.Types.ObjectId, ref: "Household", required: true },
    date: { type: Date, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    taskName: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    completed: { type: Boolean, default: false },
    completedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    weight: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export const TaskLog: Model<ITaskLog> =
  mongoose.models.TaskLog || mongoose.model<ITaskLog>("TaskLog", TaskLogSchema);
