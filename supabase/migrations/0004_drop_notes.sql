-- Removes the sync spike table. The tasks and projects tables (0003) replaced it, and nothing in the app or the tests
-- uses it any more. This deletes its rows for good. The policies, trigger, index and realtime entry go with the table.
-- `handle_times()` stays: tasks and projects use it.
drop table public.notes;
