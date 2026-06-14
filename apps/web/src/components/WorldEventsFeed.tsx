import type { WorldEvent } from '../store/worldStore';

const EVENT_META: Record<string, { icon: string; color: string; label: string }> = {
  sanction:            { icon: '🚫', color: '#f87171', label: 'Sanction'        },
  trade_deal:          { icon: '🤝', color: '#34d399', label: 'Trade Deal'      },
  military_posture:    { icon: '⚔️',  color: '#fbbf24', label: 'Military'       },
  diplomatic_protest:  { icon: '📣', color: '#fb923c', label: 'Protest'         },
  alliance_formed:     { icon: '🔗', color: '#a78bfa', label: 'Alliance'        },
  alliance_broken:     { icon: '💔', color: '#f87171', label: 'Alliance Broken' },
  conflict_risk:       { icon: '🔴', color: '#ef4444', label: 'Conflict Risk'   },
};

function EventRow({ event, index }: { event: WorldEvent; index: number }) {
  const meta = EVENT_META[event.event_type] ?? { icon: '🌐', color: '#9ca3af', label: event.event_type };

  return (
    <div
      className="event-card fade-up"
      style={{
        borderLeftColor: meta.color,
        animationDelay: `${index * 0.04}s`,
      }}
    >
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 13 }}>{meta.icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6,
          color: meta.color, background: `${meta.color}15`,
          border: `1px solid ${meta.color}30`,
          padding: '2px 6px', borderRadius: 4,
        }}>
          {meta.label}
        </span>
        <span style={{ color: '#4b5563', fontSize: 10, marginLeft: 'auto', fontWeight: 600 }}>
          yr {event.sim_year}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#e5e7eb' }}>{event.from_country}</span>
        {event.to_country && (
          <>
            <span style={{ color: '#374151', fontSize: 10 }}>→</span>
            <span style={{ fontWeight: 700, fontSize: 12, color: '#e5e7eb' }}>{event.to_country}</span>
          </>
        )}
      </div>

      <p style={{ color: '#6b7280', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
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
      <p style={{ color: '#4b5563', fontSize: 13 }}>
        No inter-country events yet. Events appear after the first agent simulation cycle.
      </p>
    );
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: maxHeight }}>
      {events.map((e, i) => <EventRow key={e.id} event={e} index={i} />)}
    </div>
  );
}
