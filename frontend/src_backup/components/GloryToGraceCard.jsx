import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { canAccessPage, getCurrentUser } from '../features/auth/permissionService';
import { getToken } from '../features/auth/authService';
import axios from 'axios';

/* ---------- Featured Poster (animated + modal) ---------- */
function FeaturedPoster() {
  const [open, setOpen] = useState(false);
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        ref={cardRef}
        className={[
          'mt-6 rounded-xl overflow-hidden shadow-lg border bg-white relative',
          'transition-all duration-700 will-change-transform',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        ].join(' ')}
      >
        <img
          src="/assets/glory-to-grace.jpg"
          alt="From Glory to Grace — The Journey of Pastor Sam Masih"
          className="w-full h-auto object-cover"
          loading="lazy"
        />

        {/* subtle gradient + actions */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex items-end justify-between gap-3">
          <div className="text-white">
            <h4 className="text-sm font-semibold tracking-wide">Featured Story</h4>
            <p className="text-xs opacity-90">From Glory to Grace</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/assets/glory-to-grace.jpg"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-white/90 hover:bg-white shadow"
            >
              Open poster
            </a>
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-900 text-white shadow"
            >
              Read testimony
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="From Glory to Grace"
        >
          <div
            className="relative max-w-2xl w-full rounded-xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-h-[75vh] overflow-y-auto p-5">
              <h3 className="text-lg font-semibold">From Glory to Grace</h3>
              <p className="mt-2 text-sm text-gray-700 leading-6">
                Marked by a divine purpose before he understood it, Pastor Sam Masih’s journey
                from corporate acclaim to a life fully surrendered to Christ is a testimony of
                grace, healing, and calling. His story reflects deliverance, restoration, and a
                fresh anointing to serve—transforming lives by the power of the Holy Spirit.
              </p>
              <p className="mt-3 text-sm text-gray-700 leading-6">
                This ministry exists to worship, heal, and send—equipping believers to walk in
                freedom and purpose. Be encouraged, stay rooted in the Word, and keep your heart
                open to the voice of God.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t p-3">
              <a
                href="/assets/glory-to-grace.jpg"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm font-medium rounded-md border"
              >
                View full poster
              </a>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white"
              >
                Close
              </button>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 rounded-full bg-white p-2 shadow"
              aria-label="Close"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}


