import { useEffect, useState } from "react";

export function useLandingConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/config/landing.json")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { config, loading };
}
