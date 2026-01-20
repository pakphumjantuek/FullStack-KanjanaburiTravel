import type { PlaceDto } from "../../placeTypes";
import { PlaceCard } from "./PlaceCard";

type Props = {
  places: PlaceDto[];
  onClickLog: (placeId: number) => Promise<void>;
};

export function PlaceGrid({ places, onClickLog }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
      {places.map((place) => (
        <PlaceCard key={place.placeId} place={place} onClickLog={onClickLog} />
      ))}
    </div>
  );
}
