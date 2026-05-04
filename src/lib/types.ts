export interface CaptureRecord {
  id: string;
  created_at: string;
  image_url: string | null;
  question: string;
  answer: string;
  task_name: string | null;
  step_index: number | null;
  step_title: string | null;
}
