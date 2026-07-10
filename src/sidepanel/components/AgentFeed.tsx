import type { MessageRow } from '../../lib/db'
import type { AgentStep } from '../../lib/agent/types'
import Button from '../../ui/Button'
import Icon, { type IconName } from '../../ui/Icon'
import Spinner from '../../ui/Spinner'
import { resolveApproval, resolvePayment, stopAgent, useAgent } from '../agent'

const KNOWN_ICONS: ReadonlySet<string> = new Set([
  'page',
  'camera',
  'cursor',
  'pencil',
  'list',
  'chevron-down',
  'globe',
  'arrow-left',
  'clock',
  'copy',
  'plus',
  'external',
  'chat',
  'shield',
  'warning',
  'stop',
  'bolt'
])

function stepIcon(step: AgentStep) {
  if (step.status === 'pending') return <Spinner size={12} />
  const name = (KNOWN_ICONS.has(step.icon) ? step.icon : 'bolt') as IconName
  return <Icon name={name} size={14} />
}

export default function AgentFeed({ msg }: { msg: MessageRow }) {
  const live = useAgent((s) => (s.messageId === msg.id ? s : null))
  const steps = msg.agentSteps ?? []
  return (
    <div className="feed">
      <div className="feed-head">
        <Icon name="bolt" size={13} />
        <span>Acting in your browser</span>
        {live?.running && (
          <button className="feed-stop" onClick={stopAgent}>
            <Icon name="stop" size={11} />
            Stop
          </button>
        )}
      </div>
      <ol className="feed-list">
        {steps.map((step) => (
          <li key={step.id} className="feed-step" data-status={step.status} data-note={step.icon === 'chat' || undefined}>
            <span className="feed-icon">{stepIcon(step)}</span>
            <span className="feed-body">
              <span className="feed-label">{step.label}</span>
              {step.detail && <span className="feed-detail">{step.detail}</span>}
              {step.imageThumb && <img className="feed-thumb" src={step.imageThumb} alt="Screenshot" />}
            </span>
          </li>
        ))}
        {live?.running && steps.length === 0 && (
          <li className="feed-step" data-status="pending">
            <span className="feed-icon">
              <Spinner size={12} />
            </span>
            <span className="feed-body">
              <span className="feed-label">Sizing up the task…</span>
            </span>
          </li>
        )}
      </ol>
      {live?.awaitingHost && (
        <div className="feed-ask">
          <div className="feed-ask-text">
            <Icon name="shield" size={15} />
            <span>
              Let Briefly act on <strong>{live.awaitingHost}</strong> for this task?
            </span>
          </div>
          <div className="feed-ask-row">
            <Button size="sm" variant="primary" onClick={() => resolveApproval('once')}>
              Allow this task
            </Button>
            <Button size="sm" onClick={() => resolveApproval('always')}>
              Always on this site
            </Button>
            <Button size="sm" variant="ghost" onClick={() => resolveApproval(false)}>
              Stop
            </Button>
          </div>
        </div>
      )}
      {live?.paymentAsk && (
        <div className="feed-ask feed-ask-pay">
          <div className="feed-ask-text">
            <Icon name="warning" size={15} />
            <span>This looks like a final purchase or payment step. Approve it?</span>
          </div>
          <div className="feed-ask-row">
            <Button size="sm" variant="primary" onClick={() => resolvePayment(true)}>
              Approve this step
            </Button>
            <Button size="sm" variant="ghost" onClick={() => resolvePayment(false)}>
              Don't
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
