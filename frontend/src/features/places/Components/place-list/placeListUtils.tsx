import type { PlaceDto } from "../../placeTypes";

export function getCoverImage(place: PlaceDto) {
  const coverImage = place.images?.find((img) => img.isCover);
  const firstImage = place.images?.[0];
  return coverImage || firstImage;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function getPlaceImageUrl(place: PlaceDto) {
  const cover = getCoverImage(place);
  return cover
    ? `${import.meta.env.VITE_API_BASE_URLS ?? ""}${cover.imageUrl}`
    : "https://via.placeholder.com/400x300?text=No+Image";
}

export function buildUniqueCategories(places: PlaceDto[]) {
  return [...new Set(places.map((p) => p.categoryName).filter(isNonEmptyString))];
}
export function buildUniqueTags(places: PlaceDto[]) {
  return [...new Set(places.flatMap((p) => p.tags || []))];
}

export function filterPlaces(
  places: PlaceDto[],
  selectedCategory: string | null,
  selectedTag: string | null
) {
  return places.filter((place) => {
    const categoryMatch = !selectedCategory || place.categoryName === selectedCategory;
    const tagMatch = !selectedTag || (place.tags || []).includes(selectedTag);
    return categoryMatch && tagMatch;
  });
}

