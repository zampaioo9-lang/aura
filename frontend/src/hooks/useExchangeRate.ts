import { useState, useEffect } from 'react';
import api from '../api/client';

export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exchange-rate/usd-mxn')
      .then((res) => setRate(res.data.rate))
      .catch(() => setRate(null))
      .finally(() => setLoading(false));
  }, []);

  return { rate, loading };
}
