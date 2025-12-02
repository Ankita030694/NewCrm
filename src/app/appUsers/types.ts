export interface AppUser {
  id: string;
  created_at: number;
  email: string;
  name: string;
  otp: string;
  phone: string;
  role: string;
  start_date: string;
  status: string;
  topic: string;
  updated_at: number;
}

export interface AppUsersResponse {
  users: AppUser[];
  total: number;
  hasMore: boolean;
  lastId?: string;
}









