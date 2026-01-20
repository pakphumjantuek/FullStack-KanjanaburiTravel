import { useNavigate, useParams } from "react-router-dom";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { useMemo, useState } from "react";

import TextInput from "../../../components/Inputs/TextInput";
import TextAreaInput from "../../../components/Inputs/TextAreaInput";

import {
  useCreateLocalDishMutation,
  useUpdateLocalDishMutation,
  useGetByIdQuery,
  useUploadLocalDishImagesBatchMutation,
  useDeleteLocalDishImageMutation,
} from "../LocalDishApi";

import { showSuccessOk } from "../../../utils";
import type {
  CreateLocalDishPayload,
} from "../LocalDishType";

// ---------------- form types ----------------
type FormValues = {
  nameTH: string;
  nameEN: string;
  description: string;
  origin: string;
  spicyLevel: number;
  isHalal: boolean;
  isVegetarian: boolean;
  isActive: boolean;
};

// ---------------- validation ----------------
const validationSchema = Yup.object({
  nameTH: Yup.string().required("กรุณาระบุชื่ออาหารพื้นถิ่น"),
  spicyLevel: Yup.number()
    .transform((_, v) => (v === "" ? 0 : Number(v)))
    .min(0)
    .max(5),
});

export default function LocalDishForm() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  const dishIdNum = id ? Number(id) : undefined;

  const navigate = useNavigate();

  // ---------- API ----------
  const { data: dish } = useGetByIdQuery(dishIdNum!, {
    skip: !dishIdNum,
  });

  const [createLocalDish] = useCreateLocalDishMutation();
  const [updateLocalDish] = useUpdateLocalDishMutation();
  const [uploadBatch] = useUploadLocalDishImagesBatchMutation();
  const [deleteImage] = useDeleteLocalDishImageMutation();

  // ---------- image states ----------
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [replaceOld, setReplaceOld] = useState(false);

  // ---------- initial values ----------
  const initialValues: FormValues = useMemo(
    () => ({
      nameTH: dish?.nameTH ?? "",
      nameEN: dish?.nameEN ?? "",
      description: dish?.description ?? "",
      origin: dish?.origin ?? "",
      spicyLevel:
        dish?.spicyLevel !== undefined ? dish.spicyLevel : 0,
      isHalal: dish?.isHalal ?? false,
      isVegetarian: dish?.isVegetarian ?? false,
      isActive: dish?.isActive ?? true,
    }),
    [dish]
  );

  // ---------- payload ----------
  const toPayload = (v: FormValues): CreateLocalDishPayload => ({
    nameTH: v.nameTH.trim(),
    nameEN: v.nameEN?.trim() || "",
    description: v.description?.trim() || "",
    origin: v.origin?.trim() || "",
    spicyLevel: v.spicyLevel,
    isHalal: v.isHalal,
    isVegetarian: v.isVegetarian,
    isActive: v.isActive,
  });

  // ---------- upload ----------
  const uploadIfAny = async (dishId: number) => {
    if (!newFiles.length) return;

    await uploadBatch({
      dishId,
      files: newFiles,
      coverIndex,
      replaceOld,
    }).unwrap();

    setNewFiles([]);
    setCoverIndex(0);
    setReplaceOld(false);
  };

  // ---------- submit ----------
  const handleSubmit = async (values: FormValues) => {
    try {
      const payload = toPayload(values);
      let dishId: number;

      if (isEditMode) {
        if (!dishIdNum) throw new Error("ไม่พบ dishId");
        dishId = dishIdNum;

        await updateLocalDish({
          dishId,
          body: payload,
        }).unwrap();
      } else {
        const created = await createLocalDish(payload).unwrap();
        dishId = created.dishId!;
      }

      await uploadIfAny(dishId);

      await showSuccessOk("บันทึกอาหารพื้นถิ่นเรียบร้อยแล้ว");
      navigate("/admin/localdish", { replace: true });
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
    }
    console.log("Submitted values:", values);
  };

  // =====================================================
  // ======================= UI ==========================
  // =====================================================
  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, isSubmitting }) => (
          <Form className="max-w-4xl mx-auto space-y-4">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow border p-4 flex justify-between items-center">
              <h1 className="text-xl font-bold flex items-center gap-2">
                🍲 {isEditMode ? "แก้ไขอาหารพื้นถิ่น" : "เพิ่มอาหารพื้นถิ่น"}
              </h1>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/localdish")}
                  className="px-4 py-2 rounded-xl bg-gray-100"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-green-600 text-white"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>

            {/* Basic info */}
            <section className="bg-white rounded-2xl shadow border p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="ชื่ออาหาร (ไทย)" name="nameTH" />
                <TextInput label="ชื่ออาหาร (อังกฤษ)" name="nameEN" />
              </div>

              <TextAreaInput
                label="คำอธิบาย"
                name="description"
                rows={4}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TextInput label="ที่มา / วัฒนธรรม" name="origin" />
                <TextInput
                  label="ระดับเผ็ด (0-5)"
                  name="spicyLevel"
                  type="number"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.isActive}
                    onChange={(e) =>
                      setFieldValue("isActive", e.target.checked)
                    }
                  />
                  เปิดใช้งาน
                </label>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.isHalal}
                    onChange={(e) =>
                      setFieldValue("isHalal", e.target.checked)
                    }
                  />
                  ฮาลาล
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.isVegetarian}
                    onChange={(e) =>
                      setFieldValue("isVegetarian", e.target.checked)
                    }
                  />
                  มังสวิรัติ
                </label>
              </div>
            </section>

            {/* Existing Images */}
            {isEditMode && dish?.images?.length ? (
              <section className="bg-white rounded-2xl shadow border p-5">
                <h2 className="font-semibold mb-3">รูปปัจจุบัน</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {dish.images.map((img) => (
                    <div
                      key={img.imageId}
                      className="relative border rounded-xl overflow-hidden"
                    >
                      <img
                        src={`${import.meta.env.VITE_API_BASE_URLS ?? ""}${img.imageUrl}`}
                        className="w-full h-28 object-cover"
                      />
                      {img.isCover && (
                        <span className="absolute top-2 left-2 text-xs bg-white px-2 py-1 rounded">
                          ⭐ ปก
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={async () =>
                          deleteImage({
                            dishId: dishIdNum!,
                            imageId: img.imageId,
                          }).unwrap()
                        }
                        className="absolute top-2 right-2 text-xs bg-red-600 text-white px-2 py-1 rounded"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Upload Images */}
            <section className="bg-white rounded-2xl shadow border p-5">
              <h2 className="font-semibold mb-3">
                อัปโหลดรูปใหม่ (เลือกปกได้)
              </h2>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setNewFiles(files);
                  setCoverIndex(0);
                }}
              />

              <label className="flex items-center gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={replaceOld}
                  onChange={(e) => setReplaceOld(e.target.checked)}
                />
                แทนที่รูปเก่าทั้งหมด
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {newFiles.map((file, idx) => {
                  const preview = URL.createObjectURL(file);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCoverIndex(idx)}
                      className={`relative border rounded-xl overflow-hidden ${
                        idx === coverIndex
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                    >
                      <img
                        src={preview}
                        className="w-full h-28 object-cover"
                        onLoad={() => URL.revokeObjectURL(preview)}
                      />
                      <span className="absolute top-2 left-2 text-xs bg-white px-2 py-1 rounded">
                        {idx === coverIndex ? "⭐ ปก" : "เลือกเป็นปก"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </Form>
        )}
      </Formik>
    </div>
  );
}
