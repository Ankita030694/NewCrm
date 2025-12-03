export interface NotificationPayload {
  user_id: string;
  topic: string[];
  n_title: string;
  n_body: string;
  send_weekly?: boolean;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  error?: string;
}










