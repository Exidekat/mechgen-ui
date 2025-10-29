import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate the current position in an event timeline as a fraction (0-1)
 * @param startYear - The start year of the event
 * @param endYear - The end year of the event
 * @param currentYear - The current year (defaults to now)
 * @returns A number between 0 and 1 representing progress through the event
 */
export function calculateTimelinePosition(
  startYear: string,
  endYear: string,
  currentYear?: number
): number {
  const now = currentYear || new Date().getFullYear();
  const start = parseFloat(startYear);
  const end = parseFloat(endYear);

  // Calculate years elapsed since start
  const elapsed = now - start;

  // Calculate total duration
  const duration = end - start;

  // Return position as fraction (0-1)
  return elapsed / duration;
}

/**
 * Convert timeline position (0-1) to clock time in milliseconds within a 24-hour period
 * @param position - Position in timeline (0-1)
 * @returns Milliseconds into a 24-hour period
 */
export function positionToClockTime(position: number): number {
  const msInDay = 24 * 60 * 60 * 1000;
  return position * msInDay;
}

/**
 * Calculate clock hand angles based on timeline position
 * @param position - Position in timeline (0-1)
 * @returns Object with hour, minute, and second hand angles in degrees
 */
export function calculateClockAngles(position: number): {
  hour: number;
  minute: number;
  second: number;
} {
  const timeInMs = positionToClockTime(position);

  // Convert to hours, minutes, seconds
  const totalSeconds = timeInMs / 1000;
  const totalMinutes = totalSeconds / 60;
  const totalHours = totalMinutes / 60;

  // Calculate angles (0 degrees = 12 o'clock, clockwise)
  const hourAngle = (totalHours % 12) * 30; // 360° / 12 hours = 30° per hour
  const minuteAngle = (totalMinutes % 60) * 6; // 360° / 60 minutes = 6° per minute
  const secondAngle = (totalSeconds % 60) * 6; // 360° / 60 seconds = 6° per second

  return {
    hour: hourAngle,
    minute: minuteAngle,
    second: secondAngle
  };
}
