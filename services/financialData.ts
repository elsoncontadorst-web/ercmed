
import { useState, useEffect } from 'react';

// Interfaces
export interface FinancialIndicators {
    selic: number;
    ipca: number;
    minWage: number;
}

export interface MarketRate {
    type: 'VEHICLE' | 'REAL_ESTATE';
    rate: number; // Monthly rate in %
    date: string;
}

// Cache to avoid spamming APIs
let cachedIndicators: FinancialIndicators | null = null;
let cachedRates: MarketRate[] | null = null;

/**
 * Fetches current financial indicators (Selic, IPCA)
 * Uses Brasil API as primary source
 */
export const fetchFinancialIndicators = async (): Promise<FinancialIndicators> => {
    if (cachedIndicators) return cachedIndicators;

    try {
        // Fetch Selic
        const selicResponse = await fetch('https://brasilapi.com.br/api/taxas/v1/selic');
        const selicData = await selicResponse.json();
        const selic = selicData.valor || 11.25; // Fallback to recent known value

        // Fetch IPCA (Inflation) - simplified, usually from BCB or IBGE
        // For now, we'll use a static fallback or try another endpoint if available
        // Brasil API doesn't have a direct "current IPCA" endpoint that is always up to date in this specific format
        // So we will use a realistic fallback for now, or implement a more complex fetch later.
        const ipca = 4.50; // Approx annual IPCA

        // Minimum Wage 2024/2025
        const minWage = 1412.00;

        cachedIndicators = {
            selic,
            ipca,
            minWage
        };

        return cachedIndicators;
    } catch (error) {
        console.error("Error fetching financial indicators:", error);
        return {
            selic: 11.25,
            ipca: 4.5,
            minWage: 1412.00
        };
    }
};

/**
 * Fetches average market interest rates from BCB (via SGS or similar open data)
 * Since BCB API is complex (SOAP/OData), we will simulate a fetch or use a proxy if available.
 * For this MVP, we will return realistic current market averages.
 * 
 * Future improvement: Use BCB OData API: 
 * https://api.bcb.gov.br/dados/serie/bcdata.sgs.20749/dados/ultimos/1?formato=json (Credit to Individuals - Vehicles)
 */
export const fetchMarketRates = async (): Promise<MarketRate[]> => {
    if (cachedRates) return cachedRates;

    try {
        // Real implementation would hit BCB API here.
        // Series 20749: Taxa média de juros - Pessoas Físicas - Aquisição de veículos
        // Series 25444: Taxa média de juros - Pessoas Físicas - Crédito imobiliário - Taxas de mercado

        // Simulating async fetch
        await new Promise(resolve => setTimeout(resolve, 500));

        const rates: MarketRate[] = [
            {
                type: 'VEHICLE',
                rate: 1.95, // Approx 23-25% p.a. -> ~1.95% p.m.
                date: new Date().toISOString()
            },
            {
                type: 'REAL_ESTATE',
                rate: 0.95, // Approx 11-12% p.a. -> ~0.95% p.m.
                date: new Date().toISOString()
            }
        ];

        cachedRates = rates;
        return rates;
    } catch (error) {
        console.error("Error fetching market rates:", error);
        return [
            { type: 'VEHICLE', rate: 2.0, date: new Date().toISOString() },
            { type: 'REAL_ESTATE', rate: 1.0, date: new Date().toISOString() }
        ];
    }
};

// Hook for easy usage in components
export const useFinancialData = () => {
    const [indicators, setIndicators] = useState<FinancialIndicators | null>(null);
    const [marketRates, setMarketRates] = useState<MarketRate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const inds = await fetchFinancialIndicators();
            const rates = await fetchMarketRates();
            setIndicators(inds);
            setMarketRates(rates);
            setLoading(false);
        };

        loadData();
    }, []);

    return { indicators, marketRates, loading };
};
