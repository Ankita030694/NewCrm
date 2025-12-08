export interface AppFeedback {
  id: string;
  feedback: string;
  rate: number;
  submittedAt: string; // ISO string
}

export interface FeedbackResponse {
  feedbacks: AppFeedback[];
  total: number;
  hasMore: boolean;
  lastSubmittedAt?: string;
  lastId?: string;
}













