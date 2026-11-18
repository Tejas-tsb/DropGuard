import type { IconName } from '../components/Icon'

export type PageId =
  | 'overview'
  | 'prediction'
  | 'analytics'
  | 'performance'
  | 'explainability'
  | 'counseling'

export interface NavigationItem {
  id: PageId
  label: string
  icon: IconName
  title: string
  description: string
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'overview',
    title: 'Academic overview',
    description: 'A grounded view of the supplied student performance dataset.',
  },
  {
    id: 'prediction',
    label: 'Student Prediction',
    icon: 'prediction',
    title: 'Student prediction',
    description: 'Review the model signal alongside a student’s recorded academic inputs.',
  },
  {
    id: 'analytics',
    label: 'Student Analytics',
    icon: 'analytics',
    title: 'Student analytics',
    description: 'Explore observed grade distributions and academic-risk group summaries.',
  },
  {
    id: 'performance',
    label: 'Model Performance',
    icon: 'performance',
    title: 'Model performance',
    description: 'Compare the five classifiers using the exported held-out evaluation results.',
  },
  {
    id: 'explainability',
    label: 'Explainability',
    icon: 'explainability',
    title: 'Model explainability',
    description: 'See which inputs the fitted Random Forest used most in its predictions.',
  },
  {
    id: 'counseling',
    label: 'Counseling Center',
    icon: 'counseling',
    title: 'Counseling center',
    description: 'Turn academic signals into a practical, student-led support conversation.',
  },
]
