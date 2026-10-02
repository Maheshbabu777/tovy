import { useRouter } from 'expo-router'
import { Icons } from './icons'
import { projectStats, taskCountLabel } from '../core/projects'
import { Page } from './components/Page'
import { ScreenHeader } from './components/ScreenHeader'
import { Group, Row } from './components/SettingsList'
import { useTaskData } from './useTaskData'

// Browse (the phone's fourth tab): the projects, then the account and settings. On the web the sidebar holds the same.
export function BrowseScreen() {
  const router = useRouter()
  const { tasks, projects } = useTaskData()
  const openProject = (id: string) => router.navigate({ pathname: '/projects', params: { id } })
  return (
    <Page maxWidth={576}>
      <ScreenHeader title="Browse" titleTestID="browse-title" />
      <Group title="Projects">
        {projects.map((p) => (
          <Row
            key={p.id}
            label={p.name}
            icon={Icons.project}
            value={taskCountLabel(projectStats(p.id, tasks).count)}
            onPress={() => openProject(p.id)}
            testID={`browse-project-${p.id}`}
          />
        ))}
        <Row
          label="All projects"
          icon={Icons.projects}
          onPress={() => router.navigate('/projects')}
          testID="browse-projects"
        />
      </Group>
      <Group title="You">
        <Row
          label="Profile and settings"
          icon={Icons.account}
          onPress={() => router.navigate('/profile')}
          testID="browse-profile"
        />
      </Group>
    </Page>
  )
}
