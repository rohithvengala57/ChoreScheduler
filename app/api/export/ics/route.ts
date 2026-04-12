import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Schedule } from "@/lib/models/Schedule";
import { Person } from "@/lib/models/Person";
import { Task } from "@/lib/models/Task";
import { DAYS_OF_WEEK } from "@/lib/types";

const DAY_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildICS(events: ICSEvent[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Roommate Chore Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evt of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${evt.uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(evt.start)}`,
      `DTEND:${formatICSDate(evt.end)}`,
      `SUMMARY:${evt.summary}`,
      `DESCRIPTION:${evt.description}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

interface ICSEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description: string;
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("scheduleId");
    const householdId = searchParams.get("householdId");
    const personId = searchParams.get("personId"); // optional filter

    let schedule;
    if (scheduleId) {
      schedule = await Schedule.findById(scheduleId).lean();
    } else if (householdId) {
      schedule = await Schedule.findOne({ householdId }).sort({ generatedAt: -1 }).lean();
    }

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
    }

    const [people, tasks] = await Promise.all([
      Person.find({ householdId: schedule.householdId }).lean(),
      Task.find({ householdId: schedule.householdId }).lean(),
    ]);

    const personMap = new Map(people.map((p) => [p._id.toString(), p.name]));
    const taskMap = new Map(tasks.map((t) => [t._id.toString(), { name: t.name, timeOfDay: t.timeOfDay }]));

    const weekStart = new Date(schedule.weekStart);
    // Ensure weekStart is a Monday
    weekStart.setUTCHours(0, 0, 0, 0);

    const events: ICSEvent[] = [];

    const assignments = personId
      ? schedule.assignments.filter((a) => a.personId.toString() === personId)
      : schedule.assignments;

    for (const assignment of assignments) {
      const task = taskMap.get(assignment.taskId.toString());
      const personName = personMap.get(assignment.personId.toString()) ?? "?";
      if (!task) continue;

      const dayOffset = DAY_INDEX[assignment.day] ?? 0;
      const eventDate = new Date(weekStart);
      eventDate.setUTCDate(eventDate.getUTCDate() + dayOffset);

      // Set time based on timeOfDay
      let startHour = 20; // default evening
      if (task.timeOfDay === "morning") startHour = 8;
      else if (task.timeOfDay === "afternoon") startHour = 14;

      const start = new Date(eventDate);
      start.setUTCHours(startHour, 0, 0, 0);
      const end = new Date(start);
      end.setUTCHours(startHour + 1, 0, 0, 0);

      events.push({
        uid: `${assignment.personId}-${assignment.taskId}-${assignment.day}-chore@chore-scheduler`,
        start,
        end,
        summary: `${task.name} — ${personName}`,
        description: `${personName} is scheduled to do ${task.name} on ${assignment.day}.`,
      });
    }

    const icsContent = buildICS(events);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="chore-schedule.ics"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
