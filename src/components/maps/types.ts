import type { Tone } from "@/types/common";
import type { LatLng } from "@/types/geo";

export interface AreaMapFeature {
  id: string;
  name: string;
  polygon: LatLng[];
  tone: Tone;
  /** Status label shown in the tooltip, e.g. "Higher than baseline". */
  label: string;
  /** Formatted value shown in the tooltip, e.g. "4.2 lakh L". */
  value?: string;
  /** Navigated to on click when no `onSelect` handler is given. */
  href?: string;
}

export interface AreaMapMarker {
  id: string;
  position: LatLng;
  tone: Tone;
  label: string;
  value?: string;
}

export interface MapLegendItem {
  tone: Tone;
  label: string;
}

export interface AreaMapProps {
  features: ReadonlyArray<AreaMapFeature>;
  center?: LatLng;
  /** Default 13. */
  zoom?: number;
  /** Container height (px or CSS length). Default 360. */
  height?: number | string;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  legend?: ReadonlyArray<MapLegendItem>;
  markers?: ReadonlyArray<AreaMapMarker>;
  /** Disable wheel zoom (default: wheel zoom off so pages scroll normally). */
  scrollWheelZoom?: boolean;
  className?: string;
  /** Accessible name for the map region. */
  ariaLabel?: string;
}
