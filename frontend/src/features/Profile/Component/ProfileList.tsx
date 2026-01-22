  import React, { useEffect, useState } from "react";
  import {
    useGetProfileQuery,
    useUpdateProfileMutation,
  } from "../../../features/auth/authApi";
  import { Edit2, Mail, Phone, Save, X, User, Heart, Calendar, MapPin, Sparkles, Map } from "lucide-react";
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin text-emerald-500">
              <Sparkles size={48} />
            </div>
            <p className="text-gray-400 font-medium animate-pulse">กำลังโหลดข้อมูลนักเดินทาง...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white border border-red-100 shadow-xl rounded-3xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="text-red-500" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-gray-500 mb-6">{msgError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      );
    }

    if (!profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
             <User size={64} className="text-gray-300 mx-auto mb-4" />
             <p className="text-gray-500 font-medium text-lg">ไม่พบข้อมูลผู้ใช้</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen pb-12 bg-slate-50 font-sans">
        {/* Decorative Header Background */}
        <div className="h-[280px] w-full bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-slate-50/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 -mt-32">
          
          {/* Main Profile Card */}
          <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/50 mb-8">
             <div className="px-6 sm:px-10 pb-8 pt-6 relative">
                 <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
                     {/* Avatar Section */}
                     <div className="relative shrink-0 -mt-20 md:-mt-24">
                        {avatarPreview ? (
                            <div className="relative group">
                                <img
                                    src={avatarPreview.startsWith("blob:") ? avatarPreview : `${import.meta.env.VITE_API_BASE_URLS}${profile.avatarUrl}`}
                                    alt={displayName}
                                    className="w-32 h-32 sm:w-44 sm:h-44 object-cover rounded-full border-[6px] border-white shadow-2xl transition-transform duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 rounded-full border-[6px] border-white shadow-inner opacity-10"></div>
                            </div>
                        ) : (
                            <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full border-[6px] border-white shadow-2xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-amber-500 text-white transform transition-transform duration-300 hover:scale-105">
                                <span className="text-5xl sm:text-6xl font-black tracking-tighter">
                                    {getInitials(displayName)}
                                </span>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)}
                            className="absolute bottom-1 right-1 p-2.5 bg-white text-gray-700 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50 hover:text-emerald-600 transition-all duration-200 group"
                            title={isEditMode ? "ยกเลิกแก้ไข" : "แก้ไขโปรไฟล์"}
                        >
                            {isEditMode ? <X size={20} /> : <Edit2 size={20} />}
                        </button>
                     </div>

                     {/* Profile Info Section */}
                     <div className="flex-1 text-center md:text-left pb-2">
                         <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1 justify-center md:justify-start">
                             <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 tracking-tight">
                                {displayName}
                             </h1>
                             <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 w-fit mx-auto md:mx-0">
                                {profile.roleName}
                             </span>
                         </div>
                         
                         <div className="flex items-center justify-center md:justify-start gap-4 text-gray-500 font-medium">
                            <div className="flex items-center gap-1.5">
                                <MapPin size={16} className="text-orange-500" />
                                <span>นักเดินทาง</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Calendar size={16} className="text-blue-500" />
                                <span>สมาชิกใหม่</span>
                            </div>
                         </div>
                     </div>

                     {/* Stats / Action Section */}
                     <div className="hidden md:flex flex-col items-end gap-2 pb-2">
                        <div className="flex gap-4">
                            <div className="text-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 min-w-[100px]">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">สถานะ</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    <span className="text-green-600 font-bold text-sm">Active</span>
                                </div>
                            </div>
                        </div>
                     </div>
                 </div>
             </div>

             {/* Navigation Tabs */}
             <div className="flex items-center justify-center md:justify-start gap-8 px-6 sm:px-10 border-t border-gray-100/50 bg-white/50 rounded-b-[2.5rem]">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`group flex items-center gap-2 py-5 border-b-[3px] font-bold text-sm tracking-wide transition-all duration-200 ${
                        activeTab === 'info' 
                        ? 'border-emerald-500 text-emerald-700' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <User size={18} className={activeTab === 'info' ? 'fill-emerald-100' : 'group-hover:scale-110 transition-transform'} />
                    ข้อมูลส่วนตัว
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`group flex items-center gap-2 py-5 border-b-[3px] font-bold text-sm tracking-wide transition-all duration-200 ${
                        activeTab === 'favorites' 
                        ? 'border-orange-500 text-orange-600' 
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                >
                    <Heart size={18} className={activeTab === 'favorites' ? 'fill-orange-100' : 'group-hover:scale-110 transition-transform'} />
                    รายการที่บันทึก
                </button>
             </div>
          </div>

          {/* Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-8">
                {activeTab === 'info' ? (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-10 relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                             <User size={120} />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3 relative z-10">
                            <span className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                <User size={24} />
                            </span>
                            แก้ไขข้อมูลส่วนตัว
                        </h2>

                        {isEditMode ? (
                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">ชื่อที่แสดง</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-slate-50/50"
                                            placeholder="ชื่อของคุณ"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">อีเมล</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full px-5 py-3 border-2 border-transparent bg-slate-100 rounded-2xl text-gray-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">เบอร์โทรศัพท์</label>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-slate-50/50"
                                            placeholder="0xx-xxx-xxxx"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 ml-1">อัปเดตรูปโปรไฟล์</label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => onPickFile(e.target.files?.[0])}
                                                className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-slate-50 mt-8">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-white shadow-lg shadow-emerald-200 transition-all transform active:scale-95 ${
                                            isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                                        }`}
                                    >
                                        <Save size={20} />
                                        {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">ชื่อ-นามสกุล</p>
                                    <p className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">{displayName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">อีเมล</p>
                                    <div className="flex items-center gap-2 text-gray-800 border-b border-gray-100 pb-2">
                                        <Mail size={18} className="text-emerald-500" />
                                        <p className="text-lg font-medium">{profile.email}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">เบอร์โทรศัพท์</p>
                                    <div className="flex items-center gap-2 text-gray-800 border-b border-gray-100 pb-2">
                                        <Phone size={18} className="text-emerald-500" />
                                        <p className="text-lg font-medium">{phoneNumber || <span className="text-gray-400 italic">ไม่ได้ระบุ</span>}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">รหัสสมาชิก</p>
                                    <p className="text-lg font-mono font-medium text-gray-500 bg-gray-50 inline-block px-3 py-1 rounded-lg border border-gray-100">#{profile.userId}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[500px] flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-50 via-transparent to-transparent opacity-50"></div>
                        <div className="relative z-10 max-w-sm mx-auto">
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-orange-50/50">
                                <Heart size={40} className="text-orange-400 fill-orange-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">ยังไม่มีรายการที่บันทึก</h3>
                            <p className="text-gray-500 mb-8 leading-relaxed">
                                เริ่มต้นการเดินทางของคุณ! สำรวจสถานที่ที่น่าสนใจในกาญจนบุรีและบันทึกไว้ในรายการโปรดของคุณ
                            </p>
                            <button className="px-8 py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mx-auto">
                                <Map size={20} />
                                ค้นหาสถานที่ท่องเที่ยว
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Column */}
            <div className="space-y-6">
                
                {/* Status Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                             <Sparkles size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">ระดับนักเดินทาง</p>
                            <p className="text-lg font-bold text-gray-800">ผู้เริ่มต้น</p>
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div className="bg-emerald-500 h-2 rounded-full w-[15%]"></div>
                    </div>
                    <p className="text-xs text-gray-500 text-right">อีก 850 คะแนนเพื่อเลื่อนระดับ</p>
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-lg shadow-blue-200 text-white p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Sparkles size={18} className="text-yellow-300" />
                            แนะนำสำหรับคุณ
                        </p>
                        <p className="text-blue-100 text-sm mb-4 leading-relaxed">
                            อัปเดตข้อมูลส่วนตัวให้ครบถ้วน เพื่อรับข่าวสารและโปรโมชั่นพิเศษสำหรับการท่องเที่ยว
                        </p>
                        <button 
                            onClick={() => { setIsEditMode(true); setActiveTab('info'); }}
                            className="text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors py-2 px-4 rounded-xl border border-white/20 backdrop-blur-sm"
                        >
                            อัปเดตข้อมูลเลย
                        </button>
                    </div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                {/* Footer simple text */}
                <div className="text-center py-4">
                    <p className="text-xs text-gray-400">© 2024 Kanchanaburi Travel</p>
                </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  export default ProfilePage;
