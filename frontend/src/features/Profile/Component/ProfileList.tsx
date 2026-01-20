import React, { useEffect, useState } from "react";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "../../../features/auth/authApi";
import { Edit2, Mail, Phone, Save, X, User, Heart, Calendar } from "lucide-react";
import { useParams } from "react-router-dom";

export const ProfilePage: React.FC = () => {
  const { userid } = useParams<{ userid: string }>();
  const id = userid ? Number(userid) : undefined;

  const {
    data: profile,
    isLoading,
    error,
  } = useGetProfileQuery(id && !Number.isNaN(id) ? { userid: id } : undefined);

  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'favorites'>('info');
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // cleanup objectURL
  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:"))
        URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setPhoneNumber(profile.phoneNumber ?? "");
      setAvatarFile(null);
      setAvatarPreview(profile.avatarUrl ?? "");
    }
  }, [profile]);

  const msgError =
    (error as any)?.data?.errorMessages?.[0] ??
    (error as any)?.error ??
    "โหลดโปรไฟล์ไม่สำเร็จ";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const onPickFile = (file?: File) => {
    if (!file) return;

    // จำกัดชนิดไฟล์แบบง่าย ๆ
    if (!file.type.startsWith("image/")) return;

    // clear preview เก่าถ้าเป็น blob
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("displayName", displayName);
    formData.append("phoneNumber", phoneNumber ?? "");
    if (avatarFile) formData.append("avatar", avatarFile);

    await updateProfile(formData).unwrap();
    setIsEditMode(false);
    setAvatarFile(null);
  };

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700 font-medium">{msgError}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100">
        <p className="text-gray-600">ไม่พบข้อมูลผู้ใช้</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 sm:mb-8">
          <div className="h-32 bg-linear-to-r from-blue-600 to-blue-900" />
          <div className="px-4 sm:px-8 pt-8 pb-6">
            <div className="flex flex-col items-center lg:flex-row lg:items-start gap-4 lg:gap-6">
              <div className="relative -mt-16 lg:-mt-20 shrink-0 z-10">
                {avatarPreview ? (
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URLS}${
                      profile.avatarUrl
                    }`}
                    alt="รูปภาพหน้าปก"
                    className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-full border-4 border-white shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl border-4 border-white shadow-xl flex items-center justify-center bg-linear-to-r from-blue-400 to-blue-700">
                    <span className="text-4xl sm:text-5xl font-bold text-white">
                      {getInitials(displayName)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
                  {displayName}
                </h1>
                <p className="text-lg text-gray-600 font-medium mb-4">
                  {profile.roleName}
                </p>

                <button
                  onClick={() => setIsEditMode((v) => !v)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg mx-auto lg:mx-0 ${
                    isEditMode
                      ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                      : "text-white"
                  }`}
                  style={
                    !isEditMode
                      ? {
                          background:
                            "linear-gradient(to right, #2563eb, #1e40af)",
                        }
                      : undefined
                  }
                >
                  {isEditMode ? <X size={18} /> : <Edit2 size={18} />}
                  <span>{isEditMode ? "ยกเลิก" : "แก้ไข"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center justify-center lg:justify-start gap-4 sm:gap-8 border-b border-gray-200 mb-6 sm:mb-8 px-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex items-center gap-2 pb-4 border-b-2 transition-all font-medium text-lg whitespace-nowrap ${
              activeTab === "info"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <User size={20} />
            ข้อมูลส่วนตัว
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-2 pb-4 border-b-2 transition-all font-medium text-lg whitespace-nowrap ${
              activeTab === "favorites"
                ? "border-pink-500 text-pink-500"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Heart size={20} />
            รายการโปรด
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            {activeTab === "info" ? (
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 flex items-center gap-2">
                  <User className="text-blue-600" />
                  ข้อมูลส่วนตัว
                </h2>

                {isEditMode ? (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          ชื่อที่แสดง
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          อีเมล
                        </label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          เบอร์โทร
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          รูปโปรไฟล์
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onPickFile(e.target.files?.[0])}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl bg-white"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          รองรับ jpg/png/webp (แนะนำขนาดไม่เกิน 2MB)
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                          isSaving
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                        }`}
                      >
                        <Save size={18} />
                        {isSaving ? "กำลังบันทึก..." : "บันทึก"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    <div className="border-b border-gray-200 pb-6">
                      <p className="text-sm font-medium text-gray-500 mb-2">
                       ชื่อ-นามสกุล
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {displayName}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          บทบาท
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {profile.roleName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">
                          รหัสผู้ใช้
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          #{profile.userId}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Mail size={20} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            อีเมล
                          </p>
                          <p className="text-gray-900 font-semibold">
                            {profile.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Phone size={20} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-500">
                            เบอร์โทรศัพท์
                          </p>
                          <p className="text-gray-900 font-semibold">
                            {phoneNumber || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 min-h-[400px]">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Heart className="text-pink-500" />
                  รายการโปรดของฉัน
                </h2>
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                    <Heart size={32} className="text-pink-500" />
                  </div>
                  <p className="text-gray-900 font-semibold text-lg mb-1">
                    ยังไม่มีรายการโปรด
                  </p>
                  <p className="text-gray-500 text-sm">
                    กดหัวใจเพื่อบันทึกสถานที่ที่คุณชอบไว้ที่นี่
                  </p>
                  <button className="mt-6 px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    ค้นหาสถานที่ท่องเที่ยว
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8">
              <p className="text-sm font-medium text-gray-500 mb-3">
                สถานะบัญชี
              </p>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <p className="text-lg font-bold text-green-600">กำลังใช้งาน</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8">
              <p className="text-sm font-medium text-gray-500 mb-3">
                สมาชิกตั้งแต่
              </p>
              <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={20} className="text-blue-500" />
                2024-05-15
              </p>
            </div>

            <div className="rounded-2xl shadow-lg p-4 sm:p-8 border border-blue-100 bg-linear-to-br from-sky-50 to-sky-100">
              <p className="text-sm font-medium text-blue-700 mb-2">
                💡 Pro Tip
              </p>
              <p className="text-sm text-blue-700">
                คลิก "แก้ไข" เพื่ออัปเดตข้อมูลของคุณ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
