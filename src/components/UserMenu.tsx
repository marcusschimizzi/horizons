'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useExperienceConfig } from '@/stores/theme-store';

interface UserMenuProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { css } = useExperienceConfig();

  const displayName = userName || userEmail?.split('@')[0] || 'User';
  const initial = displayName[0]?.toUpperCase() ?? '?';

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div style={{ position: 'fixed', top: 20, right: 64, zIndex: 100 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `${css.accentGlow}26`,
          border: `1px solid ${css.accentGlow}40`,
          color: css.textSecondary,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-body), sans-serif',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 0.2s ease',
        }}
        aria-label="User menu"
      >
        {initial}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            minWidth: 180,
            background: `${css.bgSecondary}f2`,
            ...(css.backdropBlur > 0 ? {
              backdropFilter: `blur(${css.backdropBlur + 4}px)`,
              WebkitBackdropFilter: `blur(${css.backdropBlur + 4}px)`,
            } : {}),
            border: `1px solid ${css.accentGlow}1f`,
            borderRadius: 12,
            padding: '8px 0',
            fontSize: 12,
            fontFamily: 'var(--font-body), sans-serif',
          }}
        >
          <div style={{ padding: '8px 14px', color: css.textPrimary, fontWeight: 500 }}>
            {displayName}
          </div>
          {userEmail && (
            <div style={{ padding: '0 14px 8px', color: css.textMuted, fontSize: 11 }}>
              {userEmail}
            </div>
          )}
          <div style={{ height: 1, background: `${css.textSecondary}1a`, margin: '4px 0' }} />
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 14px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              color: signingOut ? css.textMuted : css.textSecondary,
              fontSize: 12,
              fontFamily: 'var(--font-body), sans-serif',
              cursor: signingOut ? 'default' : 'pointer',
            }}
          >
            {signingOut ? 'Signing out\u2026' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
