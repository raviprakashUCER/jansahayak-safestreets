import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";

type PinColor = "green" | "coral" | "amber";

function Pin({ color }: { color: PinColor }) {
  return (
    <span className={`map-pin map-pin-${color}`} aria-hidden="true">
      <span />
    </span>
  );
}

export function MapIllustration() {
  return (
    <div
      className="map-card"
      id="map"
      aria-label="Illustration of reported road hazards in Greater Noida"
    >
      <div className="map-card-top">
        <span className="map-label">SAFETY MAP</span>
        <span className="map-status">
          <i /> Illustrative view
        </span>
      </div>
      <div className="map-art">
        <div className="map-road road-one" />
        <div className="map-road road-two" />
        <div className="map-road road-three" />
        <div className="map-road road-four" />
        <div className="map-block block-one" />
        <div className="map-block block-two" />
        <div className="map-block block-three" />
        <div className="map-block block-four" />
        <div className="map-block block-five" />
        <div className="map-water" />
        <Pin color="coral" />
        <span className="pin-label pin-label-one">Unsafe crossing</span>
        <Pin color="amber" />
        <span className="pin-label pin-label-two">Broken footpath</span>
        <Pin color="green" />
        <span className="pin-label pin-label-three">Poor lighting</span>
      </div>
      <div className="map-card-bottom">
        <span>Explore reports near you</span>
        <Link href="/map" aria-label="Open the public safety map">
          <ArrowUpRight />
        </Link>
      </div>
    </div>
  );
}
