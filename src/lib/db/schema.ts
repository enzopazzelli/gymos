import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "coach", "student"])
export const planStatusEnum = pgEnum("plan_status", ["active", "paused", "expired"])
export const bookingStatusEnum = pgEnum("booking_status", ["confirmed", "cancelled", "recovery"])
export const exerciseCategoryEnum = pgEnum("exercise_category", [
  "strength",
  "conditioning",
  "rehab",
  "mobility",
])
export const noteTypeEnum = pgEnum("note_type", ["coach", "student", "system"])
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "transfer", "card", "other"])
export const rescheduleRequestStatusEnum = pgEnum("reschedule_request_status", [
  "pending",
  "approved",
  "rejected",
  "offered",
])

// ─── Auth.js required tables ──────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: roleEnum("role").notNull().default("student"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })]
)

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

// ─── Coaches ──────────────────────────────────────────────────────────────────

export const coaches = pgTable("coaches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  specialty: text("specialty"),
  bio: text("bio"),
  whatsappNumber: text("whatsapp_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Students ─────────────────────────────────────────────────────────────────

export const students = pgTable("students", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  coachId: text("coach_id").references(() => coaches.id, { onDelete: "set null" }),
  sport: text("sport"),
  objectives: text("objectives"),
  injuryHistory: text("injury_history"),
  startDate: date("start_date"),
  whatsappNumber: text("whatsapp_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Plans ────────────────────────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // "3 días", "4 días", "5 días"
  daysPerWeek: integer("days_per_week").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const studentPlans = pgTable("student_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: planStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Schedule ─────────────────────────────────────────────────────────────────

export const scheduleSlots = pgTable("schedule_slots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  coachId: text("coach_id")
    .notNull()
    .references(() => coaches.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Lun, 6=Dom
  startTime: text("start_time").notNull(), // "08:00"
  maxCapacity: integer("max_capacity").notNull().default(1),
  active: boolean("active").notNull().default(true),
})

export const slotAssignments = pgTable(
  "slot_assignments",
  {
    slotId: text("slot_id")
      .notNull()
      .references(() => scheduleSlots.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.slotId, t.studentId] })]
)

export const bookings = pgTable("bookings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  slotId: text("slot_id")
    .notNull()
    .references(() => scheduleSlots.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: bookingStatusEnum("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const attendance = pgTable("attendance", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  present: boolean("present").notNull().default(false),
  registeredBy: text("registered_by").references(() => users.id),
  registeredAt: timestamp("registered_at").defaultNow(),
})

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidAt: timestamp("paid_at").defaultNow().notNull(),
  periodCovered: text("period_covered"), // "Marzo 2026"
  method: paymentMethodEnum("method").notNull().default("cash"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  registeredBy: text("registered_by").references(() => users.id),
})

// ─── Exercises ────────────────────────────────────────────────────────────────

export const exercises = pgTable("exercises", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  isGlobal: boolean("is_global").notNull().default(true), // false = private del coach
  coachId: text("coach_id").references(() => coaches.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Routines ─────────────────────────────────────────────────────────────────

export const routines = pgTable("routines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  coachId: text("coach_id")
    .notNull()
    .references(() => coaches.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const routineAssignments = pgTable("routine_assignments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  active: boolean("active").notNull().default(true),
})

export const routineBlocks = pgTable("routine_blocks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  routineId: text("routine_id")
    .notNull()
    .references(() => routines.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "A", "B", "Entrada en calor"
  order: integer("order").notNull(),
})

export const routineExercises = pgTable("routine_exercises", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  blockId: text("block_id")
    .notNull()
    .references(() => routineBlocks.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  sets: integer("sets"),
  reps: text("reps"), // "8-10" o "30s" para tiempo
  technicalNotes: text("technical_notes"),
  order: integer("order").notNull(),
})

// ─── Training Sessions ────────────────────────────────────────────────────────

export const trainingSessions = pgTable("training_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  coachId: text("coach_id")
    .notNull()
    .references(() => coaches.id),
  routineId: text("routine_id").references(() => routines.id),
  bookingId: text("booking_id").references(() => bookings.id),
  date: date("date").notNull(),
  coachNotes: text("coach_notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const sessionLogs = pgTable("session_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => trainingSessions.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id")
    .notNull()
    .references(() => exercises.id),
  // [{set: 1, weight: 80, reps: 8, rpe: 7}, ...]
  setsData: jsonb("sets_data").notNull().default([]),
  order: integer("order").notNull(),
})

// ─── Metrics ──────────────────────────────────────────────────────────────────

export const metrics = pgTable("metrics", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "1RM_squat", "ROM_knee_left", "jump_cm", etc.
  value: numeric("value", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // "kg", "°", "cm", "s"
  recordedAt: date("recorded_at").notNull(),
  notes: text("notes"),
  registeredBy: text("registered_by").references(() => users.id),
})

// ─── Wellness Logs ────────────────────────────────────────────────────────────

export const wellnessLogs = pgTable("wellness_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  sleep: integer("sleep"),      // 1-5
  fatigue: integer("fatigue"),  // 1-5
  pain: integer("pain"),        // 0-10
  mood: integer("mood"),        // 1-5
  notes: text("notes"),
})

// ─── Push Subscriptions ───────────────────────────────────────────────────────

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  // Preferencias — todo desactivado por defecto
  notifyBookingReminder: boolean("notify_booking_reminder").notNull().default(false),
  notifyPlanExpiry: boolean("notify_plan_expiry").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ─── Reschedule Requests ──────────────────────────────────────────────────────

export type OfferedSlot = {
  slotId: string
  date: string
  startTime: string
  dayLabel: string
}

export const rescheduleRequests = pgTable("reschedule_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  bookingId: text("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  coachId: text("coach_id")
    .notNull()
    .references(() => coaches.id, { onDelete: "cascade" }),
  studentNote: text("student_note"),
  status: rescheduleRequestStatusEnum("status").notNull().default("pending"),
  coachNote: text("coach_note"),
  offeredSlots: jsonb("offered_slots").$type<OfferedSlot[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// ─── Notes / Bitácora ─────────────────────────────────────────────────────────

export const notes = pgTable("notes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentId: text("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  sessionId: text("session_id").references(() => trainingSessions.id),
  content: text("content").notNull(),
  type: noteTypeEnum("type").notNull().default("coach"),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Coach = typeof coaches.$inferSelect
export type Student = typeof students.$inferSelect
export type Plan = typeof plans.$inferSelect
export type StudentPlan = typeof studentPlans.$inferSelect
export type ScheduleSlot = typeof scheduleSlots.$inferSelect
export type SlotAssignment = typeof slotAssignments.$inferSelect
export type Booking = typeof bookings.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Exercise = typeof exercises.$inferSelect
export type Routine = typeof routines.$inferSelect
export type TrainingSession = typeof trainingSessions.$inferSelect
export type SessionLog = typeof sessionLogs.$inferSelect
export type Metric = typeof metrics.$inferSelect
export type WellnessLog = typeof wellnessLogs.$inferSelect
export type Note = typeof notes.$inferSelect
export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type RescheduleRequest = typeof rescheduleRequests.$inferSelect
