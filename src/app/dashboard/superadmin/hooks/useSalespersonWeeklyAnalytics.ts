import { useState, useEffect } from 'react';
import { getSalespersonWeeklyAnalytics, SalespersonWeeklyAnalytics } from '../../actions';

export const useSalespersonWeeklyAnalytics = (enabled: boolean = true) => {
    const [data, setData] = useState<SalespersonWeeklyAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getSalespersonWeeklyAnalytics();
            setData(result);
        } catch (err) {
            console.error('Error fetching salesperson weekly analytics:', err);
            setError('Failed to fetch salesperson analytics');
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
