import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Icons } from './icons'
import { projectStats, taskCountLabel } from '../core/projects'
import { Avatar } from './components/Avatar'
import { Page } from './components/Page'
import { Group, Row } from './components/SettingsList'
import { useToast } from './components/Toast'
import { ProjectSheet } from './ProjectSheet'
import { requestPalette } from './quickAdd'
import { THEME_LABEL } from './ProfilePages'
import { useTheme } from './theme'
import { radius, type } from './tokens'
import { initialsOf, useProfile } from './useProfile'
import { useTaskData } from './useTaskData'

// Browse, the phone's fourth tab (spec mobile-screens, screen 4): everything that is not a daily list, in the order a
// person reaches for it. Search first (a field, the most common reason to come here), then who you are, then projects
// with a way to make one, then settings. On the web the sidebar holds the same things.
export function BrowseScreen() {
  const router = useRouter()
  const toast = useToast()
  const { theme, preference } = useTheme()
  const c = theme.colors
  const profile = useProfile()
  const { store, tasks, projects } = useTaskData()
  const [creating, setCreating] = useState(false)
  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : ''

  return (
    <Page maxWidth={576} title="Browse" titleTestID="browse-title">
      <Pressable
        testID="browse-search"
        accessibilityRole="search"
        accessibilityLabel="Search tasks and projects"
        onPress={requestPalette}
        style={({ pressed }) => ({
          marginTop: 16,
          height: 44,
          borderRadius: radius.md,
          backgroundColor: pressed ? c.hover : c.panel,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
        })}
      >
        <Icons.search size={18} color={c.text2} />
        <Text style={[type.body, { color: c.text3 }]}>Search tasks and projects</Text>
      </Pressable>

      <Pressable
        testID="browse-profile"
        accessibilityRole="button"
        accessibilityLabel="Profile and settings"
        onPress={() => router.navigate('/profile')}
        style={({ pressed }) => ({
          marginTop: 24,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 14,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: pressed ? c.hover : 'transparent',
        })}
      >
        <Avatar initials={initialsOf(profile)} size={44} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[type.bodyMedium, { color: c.text }]}>
            {name || 'Your profile'}
          </Text>
          <Text numberOfLines={1} style={[type.meta, { color: c.text2, marginTop: 2 }]}>
            {profile ? `@${profile.username}` : 'Account and sync'}
          </Text>
        </View>
        <Icons.forward size={16} color={c.text3} />
      </Pressable>

      <Group title="Projects">
        {projects.map((p) => (
          <Row
            key={p.id}
            label={p.name}
            icon={Icons.project}
            value={taskCountLabel(projectStats(p.id, tasks).count)}
            onPress={() => router.navigate({ pathname: '/projects', params: { id: p.id } })}
            testID={`browse-project-${p.id}`}
          />
        ))}
        <Row
          label="New project"
          icon={Icons.newProject}
          chevron={false}
          onPress={() => setCreating(true)}
          testID="browse-new-project"
        />
        <Row
          label="All projects"
          icon={Icons.projects}
          onPress={() => router.navigate('/projects')}
          testID="browse-projects"
        />
      </Group>

      <Group>
        <Row
          label="Completed"
          icon={Icons.check}
          onPress={() => router.navigate('/completed')}
          testID="browse-completed"
        />
        <Row label="Habits" icon={Icons.habit} onPress={() => router.navigate('/habits')} testID="browse-habits" />
        <Row label="Labels" icon={Icons.label} onPress={() => router.navigate('/labels')} testID="browse-labels" />
        <Row label="Trash" icon={Icons.delete} onPress={() => router.navigate('/trash')} testID="browse-trash" />
      </Group>

      <Group title="AI apps">
        <Row
          label="Connected apps"
          icon={Icons.connectedApps}
          onPress={() => router.navigate('/apps')}
          testID="browse-apps"
        />
        <Row
          label="Activity"
          icon={Icons.activity}
          onPress={() => router.navigate('/activity')}
          testID="browse-activity"
        />
      </Group>

      <Group title="Settings">
        <Row
          label="Appearance"
          icon={Icons.themeLight}
          value={THEME_LABEL[preference]}
          onPress={() => router.navigate({ pathname: '/profile', params: { page: 'appearance' } })}
          testID="browse-appearance"
        />
        <Row
          label="About Tovy"
          icon={Icons.info}
          onPress={() => router.navigate({ pathname: '/profile', params: { page: 'about' } })}
          testID="browse-about"
        />
      </Group>

      <ProjectSheet
        visible={creating}
        onClose={() => setCreating(false)}
        onSave={({ name: projectName, color }) => {
          store.addProject(projectName, color)
          toast.show({ message: `Created "${projectName}"` })
        }}
      />
    </Page>
  )
}
