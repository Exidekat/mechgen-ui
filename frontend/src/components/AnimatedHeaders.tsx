interface AnimatedHeadersProps {
  eventName: string;
}

export function AnimatedHeaders({ eventName }: AnimatedHeadersProps) {
  return (
    <div className="text-center space-y-4">
      {/* First header - "YOU WILL DIE BEFORE..." */}
      <h1
        className="text-2xl md:text-3xl font-light text-black opacity-0"
        style={{
          animation: 'fade-in 1s ease-out 0.5s forwards'
        }}
      >
        YOU WILL DIE BEFORE...
      </h1>

      {/* Second header - Event name */}
      <h2
        className="text-4xl md:text-6xl lg:text-7xl font-bold text-black opacity-0"
        style={{
          animation: 'fade-in 1.5s ease-out 1.5s forwards'
        }}
      >
        {eventName.toUpperCase()}
      </h2>
    </div>
  );
}
