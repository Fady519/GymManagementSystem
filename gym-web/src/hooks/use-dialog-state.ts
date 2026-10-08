"use client";

import { useCallback, useState } from "react";

/**
 * State for a dialog or side panel that works on one item (edit this plan, delete that member).
 * The item is kept while the panel closes, so its title and text don't disappear during the
 * closing animation.
 */
export function useDialogState<T>() {
  const [state, setState] = useState<{ open: boolean; item: T | null }>({
    open: false,
    item: null,
  });

  // useCallback keeps these functions the same between renders, so table columns
  // that use them don't have to be rebuilt every time.
  /** Opens the panel for an item (or with null, e.g. "create new"). */
  const show = useCallback((item: T | null = null) => setState({ open: true, item }), []);
  /** Pass to the panel's onOpenChange. */
  const setOpen = useCallback((open: boolean) => setState((current) => ({ ...current, open })), []);

  return { open: state.open, item: state.item, show, setOpen };
}
