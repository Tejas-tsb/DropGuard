import { Icon } from '../../components/Icon'
import { PageIntro } from '../../components/PageIntro'
import { DataFootnote, EmptyState, Panel, PanelHeading } from '../../components/States'
import { formatNumber, percent } from '../../lib/format'
import type { PredictionSession } from '../../types/api'
import { buildStudentGuidance } from './guidance'

const conversationSteps = [
  {
    title: 'Invite the student’s view',
    detail: 'Begin with open questions about coursework, routines, and which forms of support feel useful to them.',
  },
  {
    title: 'Choose one manageable goal',
    detail: 'Agree on a small next step, such as a focused review block or a teacher check-in, and decide when to revisit it.',
  },
  {
    title: 'Connect to school supports',
    detail: 'Where appropriate, coordinate tutoring, make-up work, family communication, or another available educational resource.',
  },
]

export function CounselingPage({
  session,
  onOpenPrediction,
}: {
  session: PredictionSession | null
  onOpenPrediction: () => void
}) {
  const recommendations = session ? buildStudentGuidance(session.input) : []
  const isElevated = session?.result.predicted_class === 1

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Student-centered support"
        title="A plan for the next conversation"
        description="Use academic indicators to guide practical support. Keep the student’s perspective at the center of the discussion."
        action={<span className="source-chip"><Icon name="counseling" className="h-3.5 w-3.5" /> Educational guidance</span>}
      />

      {session ? (
        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Most recent model result" title="Review the academic signal in context" description="This result uses the submitted 32-input record. It is a model output, not a diagnosis or a decision about the student." />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-panel/55 p-4">
              <p className="text-xs text-muted">Model category</p>
              <p className={`mt-2 text-sm font-semibold ${isElevated ? 'text-amber-200' : 'text-mint'}`}>{session.result.risk_category}</p>
            </div>
            <div className="rounded-lg border border-line bg-panel/55 p-4">
              <p className="text-xs text-muted">Class-1 probability</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-white">{percent(session.result.academic_risk_probability)}</p>
            </div>
            <div className="rounded-lg border border-line bg-panel/55 p-4">
              <p className="text-xs text-muted">Academic indicators submitted</p>
              <p className="mt-2 text-sm font-semibold text-white">G1 {formatNumber(session.input.G1, 0)} · G2 {formatNumber(session.input.G2, 0)}</p>
            </div>
          </div>
          <DataFootnote>The target is an academic-risk proxy (`G3 &lt; 10`), not actual dropout prediction. The probability is not a medical, psychological, or counseling assessment.</DataFootnote>
        </Panel>
      ) : (
        <Panel className="p-5 sm:p-6">
          <EmptyState
            title="No student prediction is open"
            detail="You can still use the general conversation guide below, or enter a student record to receive educational suggestions tied to its academic indicators."
          />
          <div className="flex justify-center pb-3">
            <button className="button-secondary" onClick={onOpenPrediction} type="button">Open student prediction <Icon name="arrow" className="h-4 w-4" /></button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel className="p-5 sm:p-6">
          <PanelHeading
            eyebrow={session ? 'Based on submitted academic fields' : 'Academic indicators'}
            title={session ? 'Suggested discussion points' : 'General educational suggestions'}
            description="These are practical conversation starters, not diagnoses or automated interventions."
          />
          {recommendations.length ? (
            <div className="space-y-3">
              {recommendations.map((item, index) => (
                <div className="flex gap-3 rounded-lg border border-line bg-panel/45 p-4" key={item.title}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-mint/10 text-mint"><span className="text-xs font-semibold">{index + 1}</span></span>
                  <div>
                    <h3 className="text-sm font-medium text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-panel/45 p-4">
                <h3 className="text-sm font-medium text-white">Study planning</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Help the student pick a consistent study time, break work into short sessions, and review what is working together.</p>
              </div>
              <div className="rounded-lg border border-line bg-panel/45 p-4">
                <h3 className="text-sm font-medium text-white">Academic check-in</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Ask whether any lessons need revisiting and identify a trusted teacher or support resource for a follow-up.</p>
              </div>
            </div>
          )}
        </Panel>

        <Panel className="p-5 sm:p-6">
          <PanelHeading eyebrow="Conversation guide" title="A supportive check-in" description="A simple structure for a practical, non-judgmental conversation." />
          <div className="space-y-4">
            {conversationSteps.map((step, index) => (
              <div className="flex gap-3" key={step.title}>
                <div className="flex flex-col items-center">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-mint/30 bg-mint/[0.06] text-xs font-semibold text-mint">{index + 1}</span>
                  {index < conversationSteps.length - 1 && <span className="mt-1 h-full w-px bg-line" />}
                </div>
                <div className="pb-2">
                  <h3 className="text-sm font-medium text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="border-mint/15 bg-mint/[0.025] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-mint" />
          <div>
            <h2 className="text-sm font-semibold text-white">Keep the model in context</h2>
            <p className="mt-2 text-sm leading-6 text-muted">DropGuard predicts an academic-risk proxy defined by G3 below 10. It does not predict actual dropout, diagnose a health condition, or establish why a student may be struggling. Use school procedures and professional judgment alongside the student’s own perspective.</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
