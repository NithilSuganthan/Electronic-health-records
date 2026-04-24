-- =============================================
-- EHR System Database Schema (V2 - Role-Based)
-- =============================================

-- 1. Department
CREATE TABLE IF NOT EXISTS Department (
  Dept_ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  Dept_name TEXT NOT NULL,
  Location TEXT
);

-- 2. Doctor
CREATE TABLE IF NOT EXISTS Doctor (
  Doctor_ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  Name TEXT NOT NULL,
  Phone TEXT,
  Speciality TEXT,
  Dept_ID UUID REFERENCES Department(Dept_ID) ON DELETE SET NULL,
  User_ID UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Patient
CREATE TABLE IF NOT EXISTS Patient (
  Patient_ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  Name TEXT NOT NULL,
  Gender TEXT,
  DOB DATE,
  Phone TEXT,
  Email TEXT,
  Address TEXT,
  Blood_Group TEXT,
  Med_history TEXT,
  User_ID UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Appointment
CREATE TABLE IF NOT EXISTS Appointment (
  Appointment_ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  Time TIMESTAMPTZ NOT NULL,
  Status TEXT DEFAULT 'scheduled' CHECK (Status IN ('scheduled', 'completed', 'cancelled')),
  Notes TEXT,
  Patient_ID UUID REFERENCES Patient(Patient_ID) ON DELETE CASCADE,
  Doctor_ID UUID REFERENCES Doctor(Doctor_ID) ON DELETE CASCADE,
  Dept_ID UUID REFERENCES Department(Dept_ID) ON DELETE SET NULL
);

-- 5. Prescription
CREATE TABLE IF NOT EXISTS Prescription (
  Rx_ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  Medication TEXT NOT NULL,
  Dosage TEXT NOT NULL,
  Duration TEXT,
  Instructions TEXT,
  Prescribed_At TIMESTAMPTZ DEFAULT NOW(),
  Appointment_ID UUID REFERENCES Appointment(Appointment_ID) ON DELETE CASCADE
);

-- 6. User Profiles (maps auth.users to roles)
CREATE TABLE IF NOT EXISTS User_Profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')) DEFAULT 'patient',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE Department ENABLE ROW LEVEL SECURITY;
ALTER TABLE Doctor ENABLE ROW LEVEL SECURITY;
ALTER TABLE Patient ENABLE ROW LEVEL SECURITY;
ALTER TABLE Appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE Prescription ENABLE ROW LEVEL SECURITY;
ALTER TABLE User_Profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- User_Profiles: users can read all profiles, insert/update their own
CREATE POLICY "Users can view all profiles" ON User_Profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON User_Profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON User_Profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Department: all authenticated can read, only admins can write
CREATE POLICY "Anyone can read departments" ON Department FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert departments" ON Department FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update departments" ON Department FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete departments" ON Department FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Doctor: all can read, admins can write
CREATE POLICY "Anyone can read doctors" ON Doctor FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage doctors" ON Doctor FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update doctors" ON Doctor FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
  OR User_ID = auth.uid()
);
CREATE POLICY "Admins can delete doctors" ON Doctor FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Patient: admins can read all, patients read own, doctors read their patients
CREATE POLICY "Read patients" ON Patient FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert patients" ON Patient FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update patients" ON Patient FOR UPDATE TO authenticated USING (
  User_ID = auth.uid()
  OR EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Delete patients" ON Patient FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Appointment: all authenticated can read/write for demo
CREATE POLICY "Read appointments" ON Appointment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert appointments" ON Appointment FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update appointments" ON Appointment FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Delete appointments" ON Appointment FOR DELETE TO authenticated USING (true);

-- Prescription: all authenticated can read/write for demo
CREATE POLICY "Read prescriptions" ON Prescription FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert prescriptions" ON Prescription FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Update prescriptions" ON Prescription FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Delete prescriptions" ON Prescription FOR DELETE TO authenticated USING (true);

-- =============================================
-- Seed Data
-- =============================================
INSERT INTO Department (Dept_name, Location) VALUES
  ('Cardiology', 'Building A, Floor 2'),
  ('Neurology', 'Building B, Floor 1'),
  ('Pediatrics', 'Building A, Floor 1'),
  ('Orthopedics', 'Building C, Floor 3'),
  ('Dermatology', 'Building B, Floor 2');

-- 7. System Settings
CREATE TABLE IF NOT EXISTS System_Settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO System_Settings (key, value) VALUES ('appointment_fee', '500') ON CONFLICT (key) DO NOTHING;

ALTER TABLE System_Settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON System_Settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON System_Settings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can insert settings" ON System_Settings FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM User_Profiles WHERE id = auth.uid() AND role = 'admin')
);
