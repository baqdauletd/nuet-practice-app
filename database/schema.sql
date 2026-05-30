create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  role text not null check (role in ('instructor', 'student')),
  name text,
  created_at timestamptz default now()
);

create table if not exists test_uploads (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid references profiles(id) on delete cascade,
  file_url text not null,
  original_filename text not null,
  status text not null default 'uploaded',
  created_at timestamptz default now()
);

create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid references test_uploads(id) on delete cascade,
  subject text not null default 'math',
  question_text text not null,
  source_image_url text,
  choices jsonb,
  correct_answer text,
  ai_solution text,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  source_page int,
  approved boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists daily_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  session_date date not null default current_date,
  problem_count int not null,
  completed boolean not null default false,
  created_at timestamptz default now(),
  unique(student_id, session_date)
);

create table if not exists daily_session_problems (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references daily_sessions(id) on delete cascade,
  problem_id uuid references problems(id) on delete cascade,
  order_index int not null,
  unique(session_id, order_index),
  unique(session_id, problem_id)
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  session_problem_id uuid references daily_session_problems(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  selected_answer text,
  solution_photo_url text,
  ai_feedback jsonb,
  is_correct boolean,
  submitted_at timestamptz default now(),
  unique(session_problem_id, student_id)
);
