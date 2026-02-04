export interface Dispute {
    id: string;
    submittedAt: number;
    name: string;
    phone: string;
    query: string;
    selected_service: string;
    status?: string;
    remarks?: string;
}

export interface DisputesResponse {
    disputes: Dispute[];
    total: number;
    hasMore: boolean;
    lastId?: string;
}
