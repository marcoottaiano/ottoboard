export const TEAMS_QUERY = `
  query Teams {
    teams {
      nodes {
        id
        name
        key
      }
    }
  }
`

export const TEAM_DATA_QUERY = `
  query TeamData($teamId: String!, $after: String) {
    team(id: $teamId) {
      id
      name
      key
      states {
        nodes {
          id
          name
          color
          type
          position
        }
      }
      projects {
        nodes {
          id
          name
          description
          color
          state
          icon
        }
      }
      issues(first: 100, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          identifier
          title
          description
          priority
          url
          state {
            id
            name
          }
          assignee {
            name
            avatarUrl
          }
          project {
            id
          }
        }
      }
    }
  }
`

export const UPDATE_ISSUE_STATE_MUTATION = `
  mutation UpdateIssueState($issueId: String!, $stateId: String!) {
    issueUpdate(id: $issueId, input: { stateId: $stateId }) {
      success
      issue {
        id
        state {
          id
          name
        }
      }
    }
  }
`

export const UPDATE_ISSUE_MUTATION = `
  mutation UpdateIssue($issueId: String!, $title: String, $description: String, $priority: Int, $stateId: String) {
    issueUpdate(id: $issueId, input: { title: $title, description: $description, priority: $priority, stateId: $stateId }) {
      success
      issue {
        id
      }
    }
  }
`

export const CREATE_PROJECT_MUTATION = `
  mutation CreateProject($teamId: String!, $name: String!, $description: String, $icon: String) {
    projectCreate(input: { name: $name, description: $description, teamIds: [$teamId], icon: $icon }) {
      success
      project {
        id
        name
        description
        icon
      }
    }
  }
`

export const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($teamId: String!, $title: String!, $description: String, $priority: Int, $stateId: String, $projectId: String) {
    issueCreate(input: { teamId: $teamId, title: $title, description: $description, priority: $priority, stateId: $stateId, projectId: $projectId }) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`
