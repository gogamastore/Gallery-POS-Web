
"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMounted() {
  const [isMounted, setIsMounted] = React.useState<boolean>(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const isMobile = React.useMemo(() => {
    if (!isMounted) return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  }, [isMounted]);

  React.useEffect(() => {
    if (!isMounted) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      // This is just to trigger a re-render, the value is derived in useMemo
      setIsMounted(isMounted => !isMounted);
      setIsMounted(isMounted => !isMounted);
    }
    mql.addEventListener("change", onChange);
    
    return () => mql.removeEventListener("change", onChange);
  }, [isMounted]);


  return isMobile;
}
