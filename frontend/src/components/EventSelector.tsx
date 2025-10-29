import { ChevronDown } from 'lucide-react';
import type { Event } from '@/types/event';

interface EventSelectorProps {
  events: Event[];
  selectedEvent: Event;
  onSelectEvent: (event: Event) => void;
}

export function EventSelector({
  events,
  selectedEvent,
  onSelectEvent,
}: EventSelectorProps) {
  return (
    <div
      className="opacity-0"
      style={{
        animation: 'fade-in 1.5s ease-out 2.5s forwards'
      }}
    >
      <div className="max-w-md mx-auto mt-8">
        <label
          htmlFor="event-select"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Choose a cosmic event:
        </label>
        <div className="relative">
          <select
            id="event-select"
            value={selectedEvent.id}
            onChange={(e) => {
              const event = events.find(
                (ev) => ev.id === parseInt(e.target.value)
              );
              if (event) onSelectEvent(event);
            }}
            className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent cursor-pointer transition-all"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {selectedEvent.description && (
          <p className="mt-3 text-sm text-gray-600 italic">
            {selectedEvent.description}
          </p>
        )}
      </div>
    </div>
  );
}
