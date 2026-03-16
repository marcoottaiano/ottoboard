import type { LinearProject, LinearState, LinearIssue } from './types'
import type { Project, Column, Task, TaskPriority } from '@/types'

export function linearPriorityToLocal(n: number): TaskPriority | null {
  switch (n) {
    case 1: return 'urgent'
    case 2: return 'high'
    case 3: return 'medium'
    case 4: return 'low'
    default: return null
  }
}

export function linearProjectToProject(
  lp: LinearProject,
  teamId: string
): Omit<Project, 'id' | 'user_id' | 'created_at'> {
  return {
    name: lp.name,
    description: lp.description,
    color: lp.color,
    status: 'active',
    linear_project_id: lp.id,
    linear_team_id: teamId,
  }
}

export function linearStateToColumn(
  ls: LinearState,
  projectId: string
): Omit<Column, 'id' | 'user_id'> {
  return {
    project_id: projectId,
    name: ls.name,
    position: ls.position,
    color: ls.color,
    linear_state_id: ls.id,
    linear_state_color: ls.color,
  }
}

export function linearIssueToTask(
  li: LinearIssue,
  columnId: string,
  projectId: string
): Omit<Task, 'id' | 'user_id' | 'created_at'> {
  return {
    column_id: columnId,
    project_id: projectId,
    title: li.title,
    description: li.description,
    priority: linearPriorityToLocal(li.priority),
    due_date: null,
    labels: [],
    position: 0,
    linear_issue_id: li.id,
    linear_issue_url: li.url,
    linear_identifier: li.identifier,
    assignee_name: li.assignee?.name ?? null,
    assignee_avatar: li.assignee?.avatarUrl ?? null,
  }
}
