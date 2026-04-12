/**
 * Seed script — populates the database with the example from the spec:
 *   People: Shravani, Rohith, Pawan, Sreeya, Raviteja, Honey, Tony
 *   Tasks: Cooking (2), Dishes (1), Sweep/Mop (1), Trash (0.5)
 *   Constraints: Various examples
 *
 * Run with: npm run seed
 */

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chore-scheduler";

// ── Inline minimal models for seed script ─────────────────────────────────

const HouseholdSchema = new mongoose.Schema(
  { name: String, code: String },
  { timestamps: true }
);
const PersonSchema = new mongoose.Schema(
  { name: String, householdId: mongoose.Types.ObjectId, color: String },
  { timestamps: true }
);
const TaskSchema = new mongoose.Schema(
  { name: String, householdId: mongoose.Types.ObjectId, weight: Number, frequency: Number, timeOfDay: String },
  { timestamps: true }
);
const ConstraintSchema = new mongoose.Schema(
  {
    householdId: mongoose.Types.ObjectId,
    type: String,
    personId: mongoose.Types.ObjectId,
    taskId: mongoose.Types.ObjectId,
    day: String,
    value: Number,
    note: String,
  },
  { timestamps: true }
);
const ScheduleSchema = new mongoose.Schema(
  {
    householdId: mongoose.Types.ObjectId,
    weekStart: Date,
    assignments: [{ day: String, personId: mongoose.Types.ObjectId, taskId: mongoose.Types.ObjectId, _id: false }],
    effortPoints: [{ personId: mongoose.Types.ObjectId, points: Number, _id: false }],
    feasible: Boolean,
    warnings: [String],
    generatedAt: Date,
    isManuallyEdited: Boolean,
  },
  { timestamps: true }
);

const Household = mongoose.model("Household", HouseholdSchema);
const Person = mongoose.model("Person", PersonSchema);
const Task = mongoose.model("Task", TaskSchema);
const Constraint = mongoose.model("Constraint", ConstraintSchema);

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#ec4899", "#8b5cf6",
];

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function nanoid(len: number) {
  let out = "";
  for (let i = 0; i < len; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}

async function main() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!");

  // Clear existing seed data
  await Household.deleteMany({ name: "Sample Household" });

  // Create household
  const household = await Household.create({
    name: "Sample Household",
    code: nanoid(6),
  });
  console.log(`Created household: ${household.name} (code: ${household.code})`);

  const hhId = household._id;

  // Create people
  const peopleData = ["Shravani", "Rohith", "Pawan", "Sreeya", "Raviteja", "Honey", "Tony"];
  const people: Array<{ _id: mongoose.Types.ObjectId; name: string }> = [];
  for (let i = 0; i < peopleData.length; i++) {
    const p = await Person.create({
      name: peopleData[i],
      householdId: hhId,
      color: COLORS[i],
    });
    people.push({ _id: p._id as mongoose.Types.ObjectId, name: p.name as string });
    console.log(`  Created person: ${p.name}`);
  }

  const byName = (name: string) => people.find((p) => p.name === name)!;

  // Create tasks
  const tasksData = [
    { name: "Cooking", weight: 2, frequency: 7, timeOfDay: "morning" },
    { name: "Dishes", weight: 1, frequency: 7, timeOfDay: "evening" },
    { name: "Sweep/Mop", weight: 1, frequency: 3, timeOfDay: "any" },
    { name: "Trash", weight: 0.5, frequency: 3, timeOfDay: "evening" },
  ];
  const createdTasks: Array<{ _id: mongoose.Types.ObjectId; name: string }> = [];
  for (const t of tasksData) {
    const task = await Task.create({ ...t, householdId: hhId });
    createdTasks.push({ _id: task._id as mongoose.Types.ObjectId, name: task.name as string });
    console.log(`  Created task: ${task.name} (weight=${t.weight}, freq=${t.frequency})`);
  }

  const taskByName = (name: string) => createdTasks.find((t) => t.name === name)!;

  // Create constraints
  const constraintsData = [
    // Rohith cooks on Wednesday (fixed)
    {
      type: "fixed",
      personId: byName("Rohith")._id,
      taskId: taskByName("Cooking")._id,
      day: "Wednesday",
      note: "Rohith cooks Wednesday",
    },
    // Sreeya cannot work on Friday (day off)
    {
      type: "day_off",
      personId: byName("Sreeya")._id,
      day: "Friday",
      note: "Sreeya has Friday off",
    },
    // Honey cannot cook (restriction)
    {
      type: "restriction",
      personId: byName("Honey")._id,
      taskId: taskByName("Cooking")._id,
      note: "Honey cannot cook",
    },
    // Sreeya does trash 3 times/week (frequency)
    {
      type: "frequency",
      personId: byName("Sreeya")._id,
      taskId: taskByName("Trash")._id,
      value: 2,
      note: "Sreeya does trash 2 times/week",
    },
    // Raviteja cooks at most 2 times/week (frequency)
    {
      type: "frequency",
      personId: byName("Raviteja")._id,
      taskId: taskByName("Cooking")._id,
      value: 2,
      note: "Raviteja cooks max 2 times/week",
    },
    // Pawan prefers dishes on Wednesday (preference)
    {
      type: "preference",
      personId: byName("Pawan")._id,
      taskId: taskByName("Dishes")._id,
      day: "Wednesday",
      note: "Pawan prefers dishes on Wednesday",
    },
  ];

  for (const c of constraintsData) {
    await Constraint.create({ ...c, householdId: hhId });
    console.log(`  Created constraint: ${c.note}`);
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Household join code: ${household.code}`);
  console.log(`   Use this code on the landing page to access the sample household.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
