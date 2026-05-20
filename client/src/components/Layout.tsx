import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getInitials, getTeamColors } from "../lib/utils";

const NAV_BASE = [
  {
    to: "/",
    label: "Calendar",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    to: "/projects",
    label: "Projects",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
    ),
  },
  {
    to: "/team",
    label: "Team",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
];

const NAV_DEV = {
  to: "/admin/users",
  label: "Users",
  icon: (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const tc = getTeamColors(user?.team || "DEV");
  const nav =
    user?.role === "DEV" || user?.role === "ADMIN"
      ? [...NAV_BASE, NAV_DEV]
      : NAV_BASE;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-[#F0F0F0] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r-2 border-[#121212] flex flex-col">
        {/* Logo Header */}
        <div className="px-7 py-[19px] flex items-center border-b-2 border-[#121212] bg-white">
          <div className="flex items-center gap-[10px]">
            {/* Shapes */}
            <div className="flex items-center gap-[5px] flex-shrink-0">
              <div className="w-[19px] h-[19px] rounded-full bg-[#D02020] border-2 border-[#121212]" />
              <div className="w-[19px] h-[19px] bg-[#1040C0] border-2 border-[#121212]" />
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  d="M12 3L22 20H2L12 3Z"
                  fill="#F0C020"
                  stroke="#121212"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {/* Brand */}
            <span className="font-black text-[22px] leading-none uppercase tracking-tight text-[#121212]">
              VeWork
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 border-l-4 font-bold uppercase tracking-wider text-sm transition-all duration-150 ${
                  isActive
                    ? "border-l-[#F5C400] bg-[#FFF9E0] text-[#121212]"
                    : "border-l-transparent text-[#121212]/50 hover:bg-[#F0F0F0] hover:border-l-[#121212]/20 hover:text-[#121212]"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t-2 border-[#121212]">
          <div className="flex items-center gap-2 p-2 border-2 border-transparent hover:border-[#121212] hover:bg-[#F0F0F0] transition-all group">
            <div
              className={`w-8 h-8 flex items-center justify-center text-xs font-black border-2 border-[#121212] flex-shrink-0 ${tc.badge}`}
            >
              {getInitials(user?.name || "")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[#121212] truncate">
                {user?.name}
              </div>
              <div className="text-xs text-[#121212]/50 capitalize font-medium">
                {user?.role?.toLowerCase()}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="opacity-0 group-hover:opacity-100 text-[#121212]/40 hover:text-[#D02020] transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
