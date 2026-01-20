import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../../store/hooks";
import { useLogoutMutation } from "../../features/auth/authApi";
import { LogOut, User, UserPlus, LogIn, MapPin } from "lucide-react";

export const Navbar: React.FC = () => {
  const user = useAppSelector((s) => s.auth.user);
  const [logout, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } finally {
      navigate("/login");
    }
  };

  const isHomeActive = location.pathname === "/home";
  const isPlacesActive =
    location.pathname.startsWith("/places") ||
    location.pathname.startsWith("/placeDetails");
  const isLocalDishActive = location.pathname.startsWith("/localDishs");
  const isTripActive = location.pathname.startsWith("/trip");
  const isProfileActive = location.pathname.startsWith("/profile");

  const navLinkClass = (active: boolean) =>
    `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
      active ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <nav className="bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/home" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-100 text-green-700">
              <MapPin size={18} />
            </span>
            <span className="font-semibold text-gray-900">
              Kanchanaburi Travel
            </span>
          </Link>

          {/* Primary nav */}
          <div className="hidden md:flex items-center gap-2">
            <Link to="/home" className={navLinkClass(isHomeActive)}>
              หน้าแรก
            </Link>
            <Link to="/places" className={navLinkClass(isPlacesActive)}>
              สถานที่
            </Link>
            <Link to="/localDishs" className={navLinkClass(isLocalDishActive)}>
              อาหารท้องถิ่น
            </Link>
            {user && (
              <Link to="/trip" className={navLinkClass(isTripActive)}>
                ทริปของฉัน
              </Link>
            )}
            {user && (
              <Link to="/profile" className={navLinkClass(isProfileActive)}>
                โปรไฟล์
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 text-gray-800">
                  <User size={16} className="text-gray-600" />
                  <span className="text-sm">{user.displayName}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-white text-gray-700 border border-gray-200">
                    {user.roleName}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isLoading
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  <LogOut size={16} />
                  <span>{isLoading ? "กำลังออก..." : "ออกจากระบบ"}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <UserPlus size={16} />
                  <span>สมัครสมาชิก</span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-colors"
                >
                  <LogIn size={16} />
                  <span>เข้าสู่ระบบ</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <Link to="/home" className={navLinkClass(isHomeActive)}>
              หน้าแรก
            </Link>
            <Link to="/places" className={navLinkClass(isPlacesActive)}>
              สถานที่
            </Link>
            {user && (
              <Link to="/trip" className={navLinkClass(isTripActive)}>
                ทริปของฉัน
              </Link>
            )}
            {user && (
              <Link to="/profile" className={navLinkClass(isProfileActive)}>
                โปรไฟล์
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
