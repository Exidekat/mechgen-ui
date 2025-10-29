import { useEffect, useState } from 'react';
import { Clock } from './components/Clock';
import { AnimatedHeaders } from './components/AnimatedHeaders';
import { EventSelector } from './components/EventSelector';
import type { Event } from './types/event';

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || '';
        const response = await fetch(`${apiBase}/api/events`);

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data: Event[] = await response.json();
        setEvents(data);

        // Default to the first event (Heat Death)
        if (data.length > 0) {
          setSelectedEvent(data[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-black">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-600 mb-4">Error</h1>
          <p className="text-black">{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-2xl text-black">No events found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-12">
        {/* Animated headers */}
        <AnimatedHeaders eventName={selectedEvent.name} />

        {/* Clock component - fades in with the headers */}
        <div
          className="flex justify-center opacity-0"
          style={{
            animation: 'fade-in 1.5s ease-out 2.5s forwards'
          }}
        >
          <Clock event={selectedEvent} />
        </div>

        {/* Event selector */}
        {events.length > 1 && (
          <EventSelector
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </div>
    </div>
  );
}

export default App;
