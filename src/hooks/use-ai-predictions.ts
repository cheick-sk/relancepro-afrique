// Hook pour les prédictions IA - RelancePro Africa
// Gestion des prédictions avec cache et actualisation automatique

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './use-toast';

// Types
export interface PredictionFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface Prediction {
  debtId: string;
  reference: string | null;
  amount: number;
  paidAmount: number;
  clientName: string;
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  factors: PredictionFactor[];
  predictedDate: Date | string | null;
  cached: boolean;
}

export interface RiskAnalysis {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    category: string;
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  insights: string[];
  recommendations: string[];
  trend: 'improving' | 'stable' | 'worsening';
}

export interface UseAIPredictionsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  cacheTimeout?: number; // in milliseconds
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface UseAIPredictionsReturn {
  // Predictions
  predictions: Prediction[];
  isLoadingPredictions: boolean;
  predictionError: string | null;
  fetchPredictions: (debtIds?: string[], forceRefresh?: boolean) => Promise<void>;
  
  // Risk analysis
  riskAnalysis: Map<string, RiskAnalysis>;
  isLoadingRisk: boolean;
  riskError: string | null;
  fetchRiskAnalysis: (clientIds: string[]) => Promise<void>;
  
  // Cache management
  clearCache: () => void;
  lastUpdated: Date | null;
  
  // Utilities
  getPredictionForDebt: (debtId: string) => Prediction | undefined;
  getRiskForClient: (clientId: string) => RiskAnalysis | undefined;
  refresh: () => Promise<void>;
}

// Cache storage
const predictionCache = new Map<string, { data: Prediction; timestamp: number }>();
const riskCache = new Map<string, { data: RiskAnalysis; timestamp: number }>();

// Default cache timeout: 1 hour
const DEFAULT_CACHE_TIMEOUT = 60 * 60 * 1000;

export function useAIPredictions(
  options: UseAIPredictionsOptions = {}
): UseAIPredictionsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
    cacheTimeout = DEFAULT_CACHE_TIMEOUT,
    onSuccess,
    onError
  } = options;

  const { toast } = useToast();
  
  // State
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<Map<string, RiskAnalysis>>(new Map());
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch predictions
  const fetchPredictions = useCallback(async (
    debtIds?: string[],
    forceRefresh: boolean = false
  ) => {
    setIsLoadingPredictions(true);
    setPredictionError(null);

    try {
      let url = '/api/ai/predict';
      
      if (debtIds && debtIds.length > 0) {
        // POST request for specific debts
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ debtIds, forceRefresh })
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des prédictions');
        }

        const data = await response.json();
        
        if (data.results?.debts) {
          const newPredictions = data.results.debts.map((p: any) => ({
            ...p,
            cached: p.cached || false
          }));
          
          // Update cache
          newPredictions.forEach((pred: Prediction) => {
            predictionCache.set(pred.debtId, {
              data: pred,
              timestamp: Date.now()
            });
          });
          
          setPredictions(prev => {
            // Merge with existing predictions
            const merged = [...prev];
            newPredictions.forEach((newPred: Prediction) => {
              const index = merged.findIndex(p => p.debtId === newPred.debtId);
              if (index >= 0) {
                merged[index] = newPred;
              } else {
                merged.push(newPred);
              }
            });
            return merged;
          });
        }

        onSuccess?.(data);
      } else {
        // GET all predictions
        const response = await fetch(`${url}?all=true`);

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des prédictions');
        }

        const data = await response.json();
        setPredictions(data.predictions || []);
        
        // Cache all predictions
        (data.predictions || []).forEach((pred: Prediction) => {
          predictionCache.set(pred.debtId, {
            data: pred,
            timestamp: Date.now()
          });
        });
        
        onSuccess?.(data);
      }

      setLastUpdated(new Date());
    } catch (error: any) {
      setPredictionError(error.message);
      onError?.(error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPredictions(false);
    }
  }, [toast, onSuccess, onError]);

  // Fetch risk analysis
  const fetchRiskAnalysis = useCallback(async (clientIds: string[]) => {
    setIsLoadingRisk(true);
    setRiskError(null);

    try {
      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse des risques');
      }

      const data = await response.json();
      
      if (data.results?.clients) {
        const newRiskMap = new Map<string, RiskAnalysis>();
        
        data.results.clients.forEach((item: any) => {
          const riskData: RiskAnalysis = {
            score: item.score,
            level: item.level,
            factors: item.factors || [],
            insights: item.insights || [],
            recommendations: item.recommendations || [],
            trend: item.trend || 'stable'
          };
          
          newRiskMap.set(item.clientId, riskData);
          
          // Cache
          riskCache.set(item.clientId, {
            data: riskData,
            timestamp: Date.now()
          });
        });

        setRiskAnalysis(prev => {
          const merged = new Map(prev);
          newRiskMap.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }

      setLastUpdated(new Date());
    } catch (error: any) {
      setRiskError(error.message);
      onError?.(error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoadingRisk(false);
    }
  }, [toast, onError]);

  // Clear cache
  const clearCache = useCallback(() => {
    predictionCache.clear();
    riskCache.clear();
    setPredictions([]);
    setRiskAnalysis(new Map());
    setLastUpdated(null);
  }, []);

  // Get prediction for specific debt
  const getPredictionForDebt = useCallback((debtId: string): Prediction | undefined => {
    // Check state first
    const statePred = predictions.find(p => p.debtId === debtId);
    if (statePred) return statePred;
    
    // Check cache
    const cached = predictionCache.get(debtId);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    
    return undefined;
  }, [predictions, cacheTimeout]);

  // Get risk for specific client
  const getRiskForClient = useCallback((clientId: string): RiskAnalysis | undefined => {
    // Check state first
    const stateRisk = riskAnalysis.get(clientId);
    if (stateRisk) return stateRisk;
    
    // Check cache
    const cached = riskCache.get(clientId);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    
    return undefined;
  }, [riskAnalysis, cacheTimeout]);

  // Refresh all
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchPredictions(undefined, true),
    ]);
  }, [fetchPredictions]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refresh();
      }, refreshInterval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial fetch
  useEffect(() => {
    fetchPredictions();
  }, []);

  return {
    predictions,
    isLoadingPredictions,
    predictionError,
    fetchPredictions,
    riskAnalysis,
    isLoadingRisk,
    riskError,
    fetchRiskAnalysis,
    clearCache,
    lastUpdated,
    getPredictionForDebt,
    getRiskForClient,
    refresh
  };
}

export default useAIPredictions;
