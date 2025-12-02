import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('is_admin');
        if (!mounted) return;
        if (error) {
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(data));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { isAdmin, loading };
}
