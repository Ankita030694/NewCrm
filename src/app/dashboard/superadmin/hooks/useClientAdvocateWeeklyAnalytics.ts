import { useState, useEffect } from 'react';
import { getClientAdvocateWeeklyAnalytics, ClientAdvocateWeeklyAnalytics } from '../../actions';

export const useClientAdvocateWeeklyAnalytics = (enabled: boolean = true) => {
    const [data, setData] = useState<ClientAdvocateWeeklyAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getClientAdvocateWeeklyAnalytics();
            setData(result);
        } catch (err) {
            console.error('Error fetching client advocate weekly analytics:', err);
            setError('Failed to fetch client advocate analytics');
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
