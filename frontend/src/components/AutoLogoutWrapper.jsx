import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

function isMobileAppMode() {
  try {
    return (
      import.meta.env.MODE === "mobile" ||
      Boolean(window.Capacitor?.isNativePlatform?.())
    );
  } catch {
    return false;
  }
}

export default function AutoLogoutWrapper({ children }) {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes

  const logout = () => {
    console.warn("Auto logout due to inactivity (15 min)");

    localStorage.removeItem("mahima_token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");

    navigate("/login");
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, LOGOUT_TIME);
  };

  useEffect(() => {
    if (isMobileAppMode()) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return undefined;
    }

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer(); // start timer

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, []);

  return children;
}
