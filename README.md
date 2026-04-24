# Complete Full-Stack EHR Management System

This project is a fully functional Electronic Health Record (EHR) system covering the frontend explicitly asked in the task: a modern React Single Page Application (Vite + Tailwind CSS), mapped against a comprehensive Supabase PostgreSQL database conforming rigorously to 3NF standards.

## Project Structure

- `src/components/Layout.tsx` — Sidebar and navigation controls.
- `src/pages/` — Each feature requested is separated into dedicated view modules (Patients, Doctors, Departments, Appointments, Prescriptions, Dashboard).
- `src/context/AuthContext.tsx` — Manages Supabase Auth, sessions, and login redirect states.
- `src/lib/supabase.ts` — Houses the unified Supabase client.
- `supabase_schema.sql` (Root Folder) — An extensively mapped schema file meeting all requirements, populated with table definitions, constraints, relations, cascade deletes, trigger outlines, row level security (RLS), access policies, and seed data.

## Getting Started

1. **Supabase Backend Configuration**:
   - Go to [Supabase](https://supabase.com/) and create a new project.
   - Go to your Supabase project's SQL Editor and copy-paste the contents of `supabase_schema.sql` and click **RUN**. This generates your entire schema and sets permissions and default data.
   - On Supabase, ensure "Email" Auth Provider is enabled.
   
2. **Environment Setup**:
   - Get the your Supabase Project URL and Anon Key.
   - At the root of this frontend project (`d:/EHR`), create a file named `.env`, and populate it:
     ```env
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Running the App Locally**:
   - To install dependencies, run:
     ```bash
     npm install
     ```
   - To start the development server, run:
     ```bash
     npm run dev
     ```
   - View your application in the browser at the specified local port (usually `http://localhost:5173`).

4. **Testing Authentication**:
   - Initially, you can sign up for an account via the Sign In screen by toggling "Don't have an account? Sign Up".
   - Use those credentials to authenticate.
