export interface AppLead {
  id: string;
  created_at: number;
  email: string;
  name: string;
  phone: string;
  query: string;
  source: string;
  state: string;
}

export interface AppLeadsResponse {
  leads: AppLead[];
  total: number;
  hasMore: boolean;
  lastId?: string;
}






