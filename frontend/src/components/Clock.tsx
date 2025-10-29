import { useEffect, useState } from 'react';
import { calculateTimelinePosition, calculateClockAngles } from '@/lib/utils';
import type { Event } from '@/types/event';

interface ClockProps {
  event: Event;
  className?: string;
}

export function Clock({ event, className = '' }: ClockProps) {
  const [angles, setAngles] = useState({ hour: 0, minute: 0, second: 0 });

  useEffect(() => {
    const updateClock = () => {
      const position = calculateTimelinePosition(
        event.start_date,
        event.end_date
      );
      const newAngles = calculateClockAngles(position);
      setAngles(newAngles);
    };

    // Initial update
    updateClock();

    // Update every second
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [event]);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        style={{ maxWidth: '400px', maxHeight: '400px' }}
      >
        {/* Clock face */}
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="white"
          stroke="black"
          strokeWidth="2"
        />

        {/* Hour markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 100 + 85 * Math.sin(angle);
          const y1 = 100 - 85 * Math.cos(angle);
          const x2 = 100 + 75 * Math.sin(angle);
          const y2 = 100 - 75 * Math.cos(angle);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="black"
              strokeWidth="2"
            />
          );
        })}

        {/* Minute markers */}
        {Array.from({ length: 60 }).map((_, i) => {
          if (i % 5 === 0) return null; // Skip hour markers
          const angle = (i * 6 * Math.PI) / 180;
          const x1 = 100 + 85 * Math.sin(angle);
          const y1 = 100 - 85 * Math.cos(angle);
          const x2 = 100 + 80 * Math.sin(angle);
          const y2 = 100 - 80 * Math.cos(angle);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="black"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Hour hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 40 * Math.sin((angles.hour * Math.PI) / 180)}
          y2={100 - 40 * Math.cos((angles.hour * Math.PI) / 180)}
          stroke="black"
          strokeWidth="4"
          strokeLinecap="round"
          style={{
            transition: 'all 0.5s ease-out',
            transformOrigin: 'center',
          }}
        />

        {/* Minute hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.sin((angles.minute * Math.PI) / 180)}
          y2={100 - 60 * Math.cos((angles.minute * Math.PI) / 180)}
          stroke="black"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transition: 'all 0.5s ease-out',
            transformOrigin: 'center',
          }}
        />

        {/* Second hand */}
        <line
          x1="100"
          y1="100"
          x2={100 + 70 * Math.sin((angles.second * Math.PI) / 180)}
          y2={100 - 70 * Math.cos((angles.second * Math.PI) / 180)}
          stroke="red"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            transition: 'all 0.5s ease-out',
            transformOrigin: 'center',
          }}
        />

        {/* Center dot */}
        <circle cx="100" cy="100" r="4" fill="black" />
      </svg>

      {/* Clock description */}
      <div className="mt-4 text-center text-sm text-gray-600 max-w-md mx-auto">
        <p>
          This clock represents the timeline from{' '}
          <span className="font-semibold">Year {event.start_date}</span> to{' '}
          <span className="font-semibold">{event.name}</span>.
        </p>
        <p className="mt-2 text-xs">
          Each 24-hour cycle represents the entire cosmic timeline.
          {parseFloat(event.end_date) > 1e100 && (
            <span className="block mt-1">
              We are currently at an imperceptibly small fraction of this timeline.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
