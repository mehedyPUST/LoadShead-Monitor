'use client';

import useSWR from 'swr';

const fetcher = (url) => fetch(url).then(res => res.json());

export function useData(endpoint) {
    const { data, error } = useSWR(endpoint, fetcher, {
        revalidateOnFocus: false,
        refreshInterval: 60000,
        dedupingInterval: 30000,
    });
    return { data, error, isLoading: !data && !error };
}