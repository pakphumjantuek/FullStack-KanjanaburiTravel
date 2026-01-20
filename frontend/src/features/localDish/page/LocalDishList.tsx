import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, type Column } from "../../../components/Table/DataTable";
import TableControls from "../../../components/Table/TableControls";
import Pagination from "../../../components/Table/Pagination";
import { useDebounce } from "../../../utils/useDebounce";
import { confirmDelete, showSuccessOk } from "../../../utils";
import { useDeleteLocalDishMutation, useGetAllLocalDishQuery } from "../LocalDishApi";
import type { LocalDishType } from "../LocalDishType";


const PlaceListPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const navigate = useNavigate();

  const [deleteLocalDish] = useDeleteLocalDishMutation();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize]);

  const { data, isLoading } = useGetAllLocalDishQuery({
    page,
    pageSize,
    search: debouncedSearch,
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns: Column<LocalDishType>[] = [
    {
      header: "ชื่ออาหารท้องถิ่น",
      render: (u) => <span className="font-medium text-sm">{u.nameTH}</span>,
    },
    {
        header: "ชื่อภาษาอังกฤษ",
        render: (u) => <span className="text-sm">{u.nameEN}</span>,
    },
    {
        header: "ความเผ็ด",
        render: (u) => <span className="text-sm">{u.spicyLevel}</span>,
    },
    {
        header: "ฮาลาล",
        render: (u) => <span className="text-sm">{u.isHalal ? "ใช่" : "ไม่ใช่"}</span>,
    },
    {
        header: "มังสวิรัติ",
        render: (u) => <span className="text-sm">{u.isVegetarian ? "ใช่" : "ไม่ใช่"}</span>,
    },   
    {
      header: "จัดการ",
      align: "center",
      render: (dish) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => {
              navigate(`/admin/localDish/edit/${dish.dishId}`, {
                state: { dish },
              });
            }}
            className="bg-yellow-600 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-yellow-700 transition"
          >
            แก้ไข
          </button>
          <button
            onClick={() => {
              confirmDelete().then((confirmed) => {
                if (confirmed) {
                  deleteLocalDish(dish.dishId!);
                  showSuccessOk("ลบข้อมูลสำเร็จ!");
                }
              });
            }}
            className="bg-rose-600 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-rose-700 transition"
          >
            ลบ
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">จัดการอาหารท้องถิ่น</h1>
          <p className="text-gray-600 text-sm mt-1">
            จำนวนอาหารท้องถิ่นทั้งหมด: {total} รายการ
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/localDish/add")}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-md hover:shadow-lg"
        >
          ➕ เพิ่มอาหารท้องถิ่น
        </button>
      </div>

      <div className="mb-4">
        <TableControls
          search={search}
          pageSize={pageSize}
          searchPlaceholder="ค้นหาชื่ออาหารท้องถิ่น..."
          onSearchChange={setSearch}
          onPageSizeChange={setPageSize}
        />
      </div>

      <DataTable<LocalDishType>
        columns={columns}
        data={users}

        isLoading={isLoading}
        emptyText="ไม่มีอาหารท้องถิ่น"
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
};

export default PlaceListPage;
