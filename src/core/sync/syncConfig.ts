// One shared configuration for every synced table: ids made on the device, soft delete through `deleted`, and the
// server's `created_at` and `updated_at` as the source of order. Import this file for its effect before creating a store.
import { v4 as uuidv4 } from 'uuid'
import { configureSyncedSupabase } from '@legendapp/state/sync-plugins/supabase'

configureSyncedSupabase({
  generateId: () => uuidv4(),
  changesSince: 'last-sync',
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',
})
