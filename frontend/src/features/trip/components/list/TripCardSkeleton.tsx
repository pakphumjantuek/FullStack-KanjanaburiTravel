export const TripCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-6">
      <div className="flex justify-between items-start mb-5">
        <div className="h-6 w-24 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-6 w-6 bg-gray-100 rounded-md animate-pulse" />
      </div>
      <div className="h-6 w-3/4 bg-gray-100 rounded-md animate-pulse mb-3" />
      <div className="h-4 w-full bg-gray-100 rounded-md animate-pulse mb-2" />
      <div className="h-4 w-5/6 bg-gray-100 rounded-md animate-pulse" />
      <div className="mt-6 pt-4 border-t border-gray-50">
        <div className="flex gap-3 mb-4">
          <div className="h-9 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 flex-1 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-10 w-12 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  </div>
);
