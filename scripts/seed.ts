/**
 * Seed script — populates the database with a sample household including
 * an admin user, 7 people, 4 tasks, and several constraints.
 *
 * People: Shravani, Rohith, Pawan, Sreeya, Raviteja, Honey, Tony
 * Tasks:  Cooking (2), Dishes (1), Sweep/Mop (1), Trash (0.5)
 *
 * The admin user created is:
 *   Email:    admin@chorescheduler.local
 *   Password: password123
 *
 * Run with: npm run seed
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chore-scheduler";

// ── Inline minimal models ──────────────────────────────────────────────────────

const HouseholdSchema = new mongoose.Schema(
  { name: String, code: String },
  { timestamps: true }
);
const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, default: "admin" },
    householdId: mongoose.Types.ObjectId,
    status: { type: String, default: "active" },
  },
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
    status: { type: String, default: "approved" },
  },
  { timestamps: true }
);

const Household = mongoose.model("Household", HouseholdSchema);
const User = mongoose.model("User", UserSchema);
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
  console.log("Connected!\n");

  // Clear existing seed data
  await Household.deleteMany({ name: "Sample Household" });

  // Create household
  const household = await Household.create({ name: "Sample Household", code: nanoid(6) });
  console.log(`✔ Household: "${household.name}"  (join code: ${household.code})`);

  const hhId = household._id as mongoose.Types.ObjectId;

  // Create admin user
  const ADMIN_EMAIL = "admin@chorescheduler.local";
  const ADMIN_PASSWORD = "password123";
  await User.deleteMany({ email: ADMIN_EMAIL });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name: "Admin",
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    householdId: hhId,
    status: "active",
  });
  console.log(`✔ Admin user: ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}\n`);

  // Create people (roommates)
  const peopleNames = ["Shravani", "Rohith", "Pawan", "Sreeya", "Raviteja", "Honey", "Tony"];
  const people: Array<{ _id: mongoose.Types.ObjectId; name: string }> = [];
  for (let i = 0; i < peopleNames.length; i++) {
    const p = await Person.create({ name: peopleNames[i], householdId: hhId, color: COLORS[i] });
    people.push({ _id: p._id as mongoose.Types.ObjectId, name: p.name as string });
    console.log(`  + Person: ${p.name}`);
  }

  const byName = (name: string) => people.find((p) => p.name === name)!;

  // Create tasks
  const tasksData = [
    { name: "Cooking",   weight: 2,   frequency: 7, timeOfDay: "morning" },
    { name: "Dishes",    weight: 1,   frequency: 7, timeOfDay: "evening" },
    { name: "Sweep/Mop", weight: 1,   frequency: 3, timeOfDay: "any"     },
    { name: "Trash",     weight: 0.5, frequency: 3, timeOfDay: "evening" },
  ];
  const tasks: Array<{ _id: mongoose.Types.ObjectId; name: string }> = [];
  console.log("");
  for (const t of tasksData) {
    const task = await Task.create({ ...t, householdId: hhId });
    tasks.push({ _id: task._id as mongoose.Types.ObjectId, name: task.name as string });
    console.log(`  + Task: ${task.name}  (weight=${t.weight}, ${t.frequency}×/wk)`);
  }

  const taskByName = (name: string) => tasks.find((t) => t.name === name)!;

  // Create constraints (all pre-approved so the scheduler uses them immediately)
  const constraintsData = [
    { type: "fixed",       personId: byName("Rohith")._id,   taskId: taskByName("Cooking")._id,   day: "Wednesday", note: "Rohith cooks Wednesday" },
    { type: "day_off",     personId: byName("Sreeya")._id,                                         day: "Friday",    note: "Sreeya has Friday off" },
    { type: "restriction", personId: byName("Honey")._id,    taskId: taskByName("Cooking")._id,                     note: "Honey cannot cook" },
    { type: "frequency",   personId: byName("Sreeya")._id,   taskId: taskByName("Trash")._id,      value: 2,         note: "Sreeya does trash max 2×/wk" },
    { type: "frequency",   personId: byName("Raviteja")._id, taskId: taskByName("Cooking")._id,    value: 2,         note: "Raviteja cooks max 2×/wk" },
    { type: "preference",  personId: byName("Pawan")._id,    taskId: taskByName("Dishes")._id,     day: "Wednesday", note: "Pawan prefers dishes on Wednesday" },
  ];

  console.log("");
  for (const c of constraintsData) {
    await Constraint.create({ ...c, householdId: hhId, status: "approved" });
    console.log(`  + Constraint: ${c.note}`);
  }

  console.log(`
✅  Seed complete!

   Household join code : ${household.code}
   Admin login         : ${ADMIN_EMAIL}
   Admin password      : ${ADMIN_PASSWORD}

   Visit http://localhost:3000/login to sign in.
`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
