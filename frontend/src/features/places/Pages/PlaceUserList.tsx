import { useMemo, useState } from "react";
import { useGetAllPlaceQuery } from "../placeApi";
import { useDebounce } from "../../../utils/useDebounce";
import { Loading } from "../../../components/Loading";
import { useBehaviorLogger } from "../../behavior/useBehaviorLogger";

import { PlaceListHeader } from "../Components/place-list/PlaceListHeader";
import { PlaceSearchBar } from "../Components/place-list/PlaceSearchBar";
import { FilterChips } from "../Components/place-list/FilterChips";
import { TagChips } from "../Components/place-list/TagChips";
import { ResultsBar } from "../Components/place-list/ResultsBar";
import { PlaceGrid } from "../Components/place-list/PlaceGrid";
import { EmptyState } from "../Components/place-list/EmptyState";
import { PaginationBar } from "../Components/place-list/PaginationBar";

import {
  buildUniqueCategories,
  buildUniqueTags,
  filterPlaces,
} from "../Components/place-list/placeListUtils";

const PlaceUserList = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const log = useBehaviorLogger();
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useGetAllPlaceQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const places = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const uniqueCategories = useMemo(
    () => buildUniqueCategories(places),
    [places],
  );
  const uniqueTags = useMemo(() => buildUniqueTags(places), [places]);

  const filteredPlaces = useMemo(
    () => filterPlaces(places, selectedCategory, selectedTag),
    [places, selectedCategory, selectedTag],
  );

  const hasFilters = Boolean(search || selectedCategory || selectedTag);

  const resetAll = () => {
    setSearch("");
    setSelectedCategory(null);
    setSelectedTag(null);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PlaceListHeader
        search={search}
        setSearch={setSearch}
        setPage={setPage}
      />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1">
        <FilterChips
          categories={uniqueCategories}
          selectedCategory={selectedCategory}
          onSelect={(cat) => {
            setSelectedCategory(cat);
            setPage(1);
          }}
        />

        <TagChips
          tags={uniqueTags}
          selectedTag={selectedTag}
          onSelect={(tag) => {
            setSelectedTag(tag);
            setPage(1);
          }}
        />

        {isLoading && <Loading />}

        <ResultsBar
          isLoading={isLoading}
          filteredCount={filteredPlaces.length}
          total={total}
          hasFilters={hasFilters}
          onClear={resetAll}
        />

        {!isLoading && filteredPlaces.length > 0 && (
          <PlaceGrid
            places={filteredPlaces}
            onClickLog={(placeId) =>
              log({
                placeId,
                actionType: "CLICK",
                metaJson: JSON.stringify({ source: "place_list" }),
              })
            }
          />
        )}

        {!isLoading && filteredPlaces.length === 0 && (
          <EmptyState onReset={resetAll} />
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default PlaceUserList;
