import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useGetByIdQuery } from "../placeApi";
import type { PlaceDto } from "../placeTypes";
import { Loading } from "../../../components/Loading";
import { showError, showSuccessOk } from "../../../utils";

import {
  useGetAllTripsQuery,
  useGetTripDetailQuery,
  useAddTripItemMutation,
} from "../../trip/tripApi";
import type { TripDto } from "../../trip/tripTypes";
import AddToTripModal from "../../trip/components/AddToTripModal";
import {
  addDays,
  daysInclusive,
  parseIso,
  sod,
  thDate,
} from "../../../utils/dateTrip";
import { useBehaviorLogger } from "../../behavior/useBehaviorLogger";

import { PlaceBreadcrumbs } from "../Components/place-detail/PlaceBreadcrumbs";
import { PlaceHeader } from "../Components/place-detail/PlaceHeader";
import { PlaceGallery } from "../Components/place-detail/PlaceGallery";
import { PlaceDescription } from "../Components/place-detail/PlaceDescription";
import { PlaceHistoryCard } from "../Components/place-detail/PlaceHistoryCard";
import { SidebarMapCard } from "../Components/place-detail/SidebarMapCard";
import { useLazyGetPlaceOpeningQuery } from "../../placeOpening/placeOpenApi";
import { PlaceReviews } from "../../placeReview/page/PlaceReviews";

export default function PlaceUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [triggerOpening] = useLazyGetPlaceOpeningQuery();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // ===== place =====
  const placeFromState = (location.state as { place?: PlaceDto } | null)?.place;
  const placeId = id ? Number(id) : placeFromState?.placeId;

  const { data: place, isLoading: isPlaceLoading } = useGetByIdQuery(placeId!, {
    skip: !placeId || !!placeFromState,
  });

  const displayPlace = placeFromState || place;

  // ✅ ใช้ logger ตัวเดียวพอ
  const log = useBehaviorLogger();

  // ===== behavior view (กันยิงซ้ำ) =====
  const viewedOnceRef = useRef<Record<number, boolean>>({});
  useEffect(() => {
    if (!placeId) return;
    if (viewedOnceRef.current[placeId]) return;
    viewedOnceRef.current[placeId] = true;

    log({ placeId, actionType: "VIEW" }).catch(() => {});
  }, [placeId, log]);

  // ===== add to trip modal =====
  const [openAddTrip, setOpenAddTrip] = useState(false);

  const { data: tripPaged, isLoading: isTripListLoading } = useGetAllTripsQuery(
    { page: 1, pageSize: 50, search: "" },
    { skip: !openAddTrip },
  );
  const trips: TripDto[] = tripPaged?.items ?? [];

  const [addTripItem, { isLoading: isAddingToTrip }] = useAddTripItemMutation();

  const [selectedTripId, setSelectedTripId] = useState<number | "">("");
  const tripIdNum = selectedTripId ? Number(selectedTripId) : null;

  const { data: tripDetailRes, isLoading: isTripDetailLoading } =
    useGetTripDetailQuery(tripIdNum!, {
      skip: !openAddTrip || !tripIdNum,
    });

  const tripResult = useMemo(() => {
    const d: any = tripDetailRes;
    return d?.result ?? d;
  }, [tripDetailRes]);

  const tripStart = useMemo(
    () => parseIso(tripResult?.startDateTime),
    [tripResult?.startDateTime],
  );
  const tripEnd = useMemo(
    () => parseIso(tripResult?.endDateTime),
    [tripResult?.endDateTime],
  );
  const tripItems = useMemo(
    () => (tripResult?.items ?? []) as any[],
    [tripResult?.items],
  );

  const [dayIndex, setDayIndex] = useState(1);
  const [arrivalTime, setArrivalTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (displayPlace?.avgVisitMinutes)
      setDuration(displayPlace.avgVisitMinutes);
  }, [displayPlace?.avgVisitMinutes]);

  useEffect(() => {
    setDayIndex(1);
    setArrivalTime("");
    setNotes("");
    setDuration(displayPlace?.avgVisitMinutes ?? 60);
  }, [selectedTripId, displayPlace?.avgVisitMinutes]);

  const dayOptions = useMemo(() => {
    if (!tripStart || !tripEnd) return [];
    const total = daysInclusive(tripStart, tripEnd);
    return Array.from({ length: total }, (_, i) => {
      const di = i + 1;
      const date = addDays(sod(tripStart), i);
      return { dayIndex: di, label: `วันที่ ${di} • ${thDate(date)}` };
    });
  }, [tripStart, tripEnd]);

  const orderIndex = useMemo(() => {
    const countInDay = tripItems.filter((x) => x.dayIndex === dayIndex).length;
    return countInDay + 1;
  }, [tripItems, dayIndex]);

  const hasTripDates = Boolean(
    tripResult?.startDateTime && tripResult?.endDateTime,
  );

  const dayOfWeekFromTripDay = (
    tripStartInput?: string | Date | null,
    dayIndex?: number | null,
  ) => {
    if (!tripStartInput) return null;

    const start =
      tripStartInput instanceof Date
        ? tripStartInput
        : new Date(tripStartInput);

    if (Number.isNaN(start.getTime())) return null;

    const offset = Math.max((dayIndex ?? 1) - 1, 0);
    const d = new Date(start);
    d.setDate(d.getDate() + offset);
    return d.getDay(); // 0-6
  };

  const handleAddToTrip = async () => {
    if (!displayPlace?.placeId) return;
    if (!tripIdNum) return alert("กรุณาเลือกทริป");

    if (
      dayOptions.length > 0 &&
      (dayIndex < 1 || dayIndex > dayOptions.length)
    ) {
      return alert("วันไม่ถูกต้อง");
    }

    // ✅ ใช้ startDateTime ของทริปที่เลือก
    const tripStartDateTime =
      (tripResult?.startDateTime as string | undefined) ?? null;

    // ✅ หา dayOfWeek ของวันในทริป
    const dow = dayOfWeekFromTripDay(tripStartDateTime, dayIndex);
    if (dow == null) return alert("ไม่สามารถตรวจสอบวันของทริปได้");

    try {
      const openingList = await triggerOpening(
        displayPlace.placeId,
        true,
      ).unwrap();
      const oh = (openingList ?? []).find((x) => x.dayOfWeek === dow) ?? null;

      if (oh?.isClosed) {
        return showError(
          "สถานที่นี้ปิดทำการในวันที่เลือก จึงไม่สามารถเพิ่มได้",
        );
      }

      await addTripItem({
        tripId: tripIdNum,
        body: {
          placeId: displayPlace.placeId,
          dayIndex,
          orderIndex,
          plannedArrivalTime: arrivalTime
            ? new Date(arrivalTime).toISOString()
            : null,
          plannedDurationMinutes: duration,
          notes: notes.trim() || null,
        },
      }).unwrap();

      await log({
        placeId: displayPlace.placeId,
        actionType: "ADD_TO_TRIP",
        metaJson: JSON.stringify({ tripId: tripIdNum }),
      }).catch(() => {});

      showSuccessOk("เพิ่มเข้าทริปสำเร็จ!");
      setOpenAddTrip(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.data?.errorMessages?.[0] ?? "เพิ่มเข้าทริปไม่สำเร็จ");
    }
  };

  if ((isPlaceLoading || !displayPlace) && !placeFromState) return <Loading />;

  if (!displayPlace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ไม่พบข้อมูลสถานที่
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
          >
            ← กลับไป
          </button>
        </div>
      </div>
    );
  }

  const images = displayPlace.images || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PlaceBreadcrumbs placeName={displayPlace.name} />
      <PlaceHeader
        name={displayPlace.name}
        averageRating={displayPlace.averageRating}
        reviewCount={displayPlace.reviewCount}
        categoryName={displayPlace.categoryName}
      />

      {/* Gallery + Map Sidebar */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Gallery */}
          <div className="lg:col-span-8">
            <div className="h-[360px] md:h-[480px] w-full">
              <PlaceGallery
                placeName={displayPlace.name}
                images={images}
                selectedImageIndex={selectedImageIndex}
                onSelect={setSelectedImageIndex}
              />
            </div>
          </div>

          {/* Right: Sidebar Map + Weather */}
          <div className="lg:col-span-4 flex flex-col gap-6 h-full">
            {/* Note: h-[550px] is removed to let it grow naturally if needed, or match gallery via flex if parent was flex */}

            <div className=" min-h-[350px]">
              <SidebarMapCard
                latitude={displayPlace.latitude}
                longitude={displayPlace.longitude}
                address={displayPlace.address}
                avgVisitMinutes={displayPlace.avgVisitMinutes}
                priceRange={displayPlace.priceRange}
                onAddToTrip={() => {
                  setOpenAddTrip(true);
                  setSelectedTripId("");
                  setDayIndex(1);
                  setArrivalTime("");
                  setDuration(displayPlace.avgVisitMinutes ?? 60);
                  setNotes("");
                }}
              />
            </div>

            {/* <WeatherWidget /> */}
          </div>
        </div>
      </section>

      <main className="flex-grow max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 pt-2 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <PlaceDescription description={displayPlace.description} />
            <PlaceHistoryCard categoryName={displayPlace.categoryName} />
            <PlaceReviews placeId={displayPlace.placeId} />
          </div>
        </div>
      </main>

      <AddToTripModal
        open={openAddTrip}
        onClose={() => setOpenAddTrip(false)}
        placeName={displayPlace.name}
        trips={trips}
        isTripListLoading={isTripListLoading}
        selectedTripId={selectedTripId}
        setSelectedTripId={setSelectedTripId}
        dayIndex={dayIndex}
        setDayIndex={setDayIndex}
        dayOptions={dayOptions}
        isTripDetailLoading={isTripDetailLoading}
        hasTripDates={hasTripDates}
        tripIdNum={tripIdNum}
        isAddingToTrip={isAddingToTrip}
        onSubmit={handleAddToTrip}
        onCreateTrip={() => {
          setOpenAddTrip(false);
          navigate("/trip/create");
        }}
      />
    </div>
  );
}
