-- Create assessment_results table
create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  question_paper_name text not null,
  handwritten_ans_pdf_name text not null,
  student_name text,
  student_name_source text check (student_name_source in ('auto_detected', 'manual', 'unspecified')) default 'unspecified',
  marks_scored numeric not null,
  max_marks numeric not null,
  created_at timestamptz default now()
);

-- Enable RLS and grant access for public inserts/selects
alter table assessment_results enable row level security;

create policy "Enable insert for all users" on assessment_results
  for insert with check (true);

create policy "Enable select for all users" on assessment_results
  for select using (true);
