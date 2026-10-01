-- Documents the spike table. It is replaced by the real Tovy tables in phase 2.
comment on table public.notes is 'Sync spike notes. Replaced by real Tovy tables in phase 2.';

-- Make the API pick up the change straight away.
notify pgrst, 'reload schema';
