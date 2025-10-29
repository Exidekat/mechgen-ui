export interface Event {
  id: number;
  name: string;
  description: string | null;
  start_date: string;  // Year as string to handle very large numbers
  end_date: string;    // Year as string to handle very large numbers
  created_at: string;
  updated_at: string;
}
