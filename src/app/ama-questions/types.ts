export interface AmaAnswer {
  answered_by: string;
  content: string;
  role: string;
  timestamp: number;
}

export interface AmaQuestion {
  id: string;
  answer?: AmaAnswer;
  commentsCount: number;
  content: string;
  phone: string;
  profileImgUrl?: string | null;
  timestamp: number;
  userId: string;
  userName: string;
  userRole: string;
}

export interface AmaComment {
  id: string;
  commentedBy: string;
  content: string;
  phone: string;
  profileImgUrl?: string;
  timestamp: number;
  userRole: string;
}

export interface AmaQuestionsResponse {
  questions: AmaQuestion[];
  total: number;
  hasMore: boolean;
  lastTimestamp?: number;
  lastId?: string;
}

export interface AmaCommentsResponse {
  comments: AmaComment[];
}











