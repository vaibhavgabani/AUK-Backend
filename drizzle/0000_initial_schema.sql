CREATE TABLE IF NOT EXISTS "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "admin_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_profiles_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "manager_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "manager_profiles_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE IF NOT EXISTS "gig_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"pay_rate" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"manager_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_datetime" timestamp NOT NULL,
	"end_datetime" timestamp NOT NULL,
	"place" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);

CREATE TABLE IF NOT EXISTS "event_gig_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"gig_id" integer NOT NULL,
	"start_datetime" timestamp NOT NULL,
	"end_datetime" timestamp NOT NULL,
	"actual_start_datetime" timestamp,
	"actual_end_datetime" timestamp,
	"status" varchar(20) DEFAULT 'assigned' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_gig_assignments_event_gig_unique" UNIQUE("event_id","gig_id")
);

CREATE TABLE IF NOT EXISTS "event_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'GBP' NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"gig_id" integer,
	"total_hours" numeric(10, 2) NOT NULL,
	"rate" numeric(10, 2),
	"amount" numeric(10, 2),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "password_reset_otps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "manager_profiles" ADD CONSTRAINT "manager_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "manager_profiles" ADD CONSTRAINT "manager_profiles_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "gig_profiles" ADD CONSTRAINT "gig_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "events" ADD CONSTRAINT "events_manager_id_manager_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."manager_profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_gig_assignments" ADD CONSTRAINT "event_gig_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_gig_assignments" ADD CONSTRAINT "event_gig_assignments_gig_id_gig_profiles_id_fk" FOREIGN KEY ("gig_id") REFERENCES "public"."gig_profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_expenses" ADD CONSTRAINT "event_expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_gig_id_gig_profiles_id_fk" FOREIGN KEY ("gig_id") REFERENCES "public"."gig_profiles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "manager_profiles_user_id_idx" ON "manager_profiles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "gig_profiles_user_id_idx" ON "gig_profiles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "events_manager_id_idx" ON "events" USING btree ("manager_id");
CREATE INDEX IF NOT EXISTS "events_start_datetime_idx" ON "events" USING btree ("start_datetime");
CREATE INDEX IF NOT EXISTS "events_end_datetime_idx" ON "events" USING btree ("end_datetime");
CREATE INDEX IF NOT EXISTS "event_gig_assignments_event_id_idx" ON "event_gig_assignments" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "event_gig_assignments_gig_id_idx" ON "event_gig_assignments" USING btree ("gig_id");
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");
CREATE INDEX IF NOT EXISTS "password_reset_otps_user_id_idx" ON "password_reset_otps" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_otps_otp_hash_idx" ON "password_reset_otps" USING btree ("otp_hash");
