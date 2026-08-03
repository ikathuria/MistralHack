import type { WorldEvent } from '../store/worldStore';

const EVENT_META: Record<string, { icon: string; color: string; label: string }> = {
  sanction:            { icon: '🚫', color: 'var(--accent-magenta)', label: 'SANCTION'        },
  trade_deal:          { icon: '🤝', color: 'var(--accent-green)', label: 'TRADE DEAL'      },
  military_posture:    { icon: '⚔️',  color: 'var(--accent-yellow)', label: 'MILITARY'       },
  diplomatic_protest:  { icon: '📣', color: 'var(--accent-orange)', label: 'PROTEST'         },
  alliance_formed:     { icon: '🔗', color: 'var(--accent-cyan)', label: 'ALLIANCE'        },
  alliance_broken:     { icon: '💔', color: 'var(--accent-magenta)', label: 'ALLIANCE BROKEN' },
  conflict_risk:       { icon: '🔴', color: 'var(--accent-magenta)', label: 'CONFLICT RISK'   },
};

function EventRow({ event }: { event: WorldEvent }) {
  const meta = EVENT_META[event.event_type] ?? { icon: '🌐', color: 'var(--accent-cyan)', label: event.event_type.toUpperCase() };

  return (
    <div
      className="game-card"
      style={{
        marginBottom: 8,
        padding: '10px 12px',
        borderLeft: `4px solid ${meta.color}`,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>{meta.icon}</span>
        <span
          className="game-badge"
          style={{
            fontSize: 9,
            color: meta.color,
            borderColor: meta.color,
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          {meta.label}
        </span>
        <span style={{ color: 'var(--accent-yellow)', fontFamily: 'var(--font-heading)', fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}>
          YR {event.sim_year}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, fontFamily: 'var(--font-heading)' }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{event.from_country}</span>
        {event.to_country && (
          <>
            <span style={{ color: 'var(--accent-cyan)', fontSize: 11, fontWeight: 800 }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{event.to_country}</span>
          </>
        )}
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: 11, margin: 0, lineHeight: 1.45 }}>
        {event.details.slice(0, 160)}{event.details.length > 160 ? '…' : ''}
      </p>
    </div>
  );
}

interface Props {
  events: WorldEvent[];
  maxHeight?: number;
}

export default function WorldEventsFeed({ events, maxHeight }: Props) {
  if (!events.length) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '16px 0', fontFamily: 'var(--font-heading)' }}>
        🌐 NO WORLD EVENTS DETECTED YET
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: maxHeight, paddingRight: 4 }}>
      {events.map(e => <EventRow key={e.id} event={e} />)}
    </div>
  );
}
