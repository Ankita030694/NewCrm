import { useState, useEffect } from 'react';
import { getClientSourceWeeklyAnalytics, ClientSourceWeeklyAnalytics } from '../../actions';

export const useClientSourceWeeklyAnalytics = (enabled: boolean = true) => {
    const [data, setData] = useState<ClientSourceWeeklyAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getClientSourceWeeklyAnalytics();
            setData(result);
        } catch (err) {
            console.error('Error fetching client source weekly analytics:', err);
            setError('Failed to fetch client source analytics');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (enabled) {
            fetchData();
        }
    }, [enabled]);

    return {
        data,
        isLoading,
        error,
        refresh: fetchData
    };
};
