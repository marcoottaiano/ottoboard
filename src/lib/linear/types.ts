export interface LinearTeam {
  id: string
  name: string
  key: string
}

export interface LinearState {
  id: string
  name: string
  color: string
  type: string
  position: number
}

export interface LinearProject {
  id: string
  name: string
  description: string | null
  color: string | null
  state: string
  icon?: string | null
}

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  description: string | null
  priority: number
  url: string
  state: {
    id: string
    name: string
  }
  assignee: {
    name: string
    avatarUrl: string | null
  } | null
  project?: {
    id: string
  } | null
}

export interface LinearTokenRow {
  user_id: string
  api_key: string
  selected_team_id: string | null
  selected_team_name: string | null
  last_synced_at: string | null
}

export interface LinearGraphQLResponse<T> {
  data: T
  errors?: Array<{ message: string }>
}
