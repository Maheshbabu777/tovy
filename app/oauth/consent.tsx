import { ConsentScreen } from '../../src/ui/ConsentScreen'

// Where Supabase's OAuth server sends the person when an AI app asks to connect (spec mcp-server). The path is set in
// the dashboard (Authentication > OAuth Server > Authorization path) and in supabase/config.toml.
export default function ConsentRoute() {
  return <ConsentScreen />
}
