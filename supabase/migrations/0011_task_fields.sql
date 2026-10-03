-- Priorities, deadlines, labels and repeats on tasks (spec task-fields). Every column has a default or allows null, so
-- an app that does not know them yet keeps working: it never sends them and gets the defaults.

alter table public.tasks
  add column priority smallint not null default 4 check (priority between 1 and 4), -- 1 highest, 4 none
  add column deadline date, -- must be done by; separate from due_date, when it is planned
  add column labels text[] not null default '{}', -- free words, shown as @word
  -- How it comes back, or null: {"every": "day" | "weekday" | "week" | "month", "days": [0-6] (week only),
  -- "interval": n (every n days, default 1)}
  add column repeat jsonb check (repeat is null or jsonb_typeof(repeat) = 'object');

-- At most 20 labels of at most 40 characters each, so a row stays small.
alter table public.tasks
  add constraint tasks_labels_size check (cardinality(labels) <= 20 and coalesce(length(array_to_string(labels, '')), 0) <= 800);
