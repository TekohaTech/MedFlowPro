import { useState } from 'react';

// Dashboard-local UI state: search modal, chart year selector, notifications
// dropdown, and pending-payments modal. All of it is local to Dashboard (no
// parent owns any of it), so it lives in a hook to keep the component under
// the 3-useState limit from AGENTS.md.
export function useDashboardState() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  // Closing the search modal also clears the query so reopening starts fresh.
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  return {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    year,
    setYear,
    showNotifDropdown,
    setShowNotifDropdown,
    pendingOpen,
    setPendingOpen,
    closeSearch,
  };
}
