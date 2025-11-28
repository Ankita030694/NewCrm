export interface AppQuery {
  id: string;
  queryId: string;
  query: string;
  status: string;
  role: string;
  phone: string;
  posted_by: string;
  submitted_at: number;
  resolved_at?: number;
  resolved_by?: {
    name: string;
    phone: string;
    role: string;
  };
  alloc_adv?: string;
  alloc_adv_secondary?: string;
  parentDocId: string;
  remarks?: string;
}

export interface AppQueriesResponse {
  queries: AppQuery[];
  total: number;
  hasMore: boolean;
  lastId?: string;
}
