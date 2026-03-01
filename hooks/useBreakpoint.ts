import { useEffect, useMemo, useState } from 'react';

type BreakpointState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

const MOBILE_MAX_WIDTH = 639;
const TABLET_MAX_WIDTH = 1024;

const getViewportWidth = () => {
  if (typeof window === 'undefined') return TABLET_MAX_WIDTH;
  return window.innerWidth;
};

export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(() => getViewportWidth());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  return useMemo(() => {
    const isMobile = width <= MOBILE_MAX_WIDTH;
    const isTablet = width >= 640 && width <= TABLET_MAX_WIDTH;
    const isDesktop = width > TABLET_MAX_WIDTH;

    return { isMobile, isTablet, isDesktop };
  }, [width]);
}

export default useBreakpoint;
