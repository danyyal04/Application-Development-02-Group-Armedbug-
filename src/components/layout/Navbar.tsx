import { useState } from "react";
import { LogOut, Settings, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

interface NavbarProps {
  user: any;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Navbar({ user, onLogout, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      {/* LOGO */}
      <div className="flex items-center gap-3">
        <img
          src="/UTMMunch-Logo.jpg"
          className="h-10 w-auto cursor-pointer"
          onClick={() => onNavigate("dashboard")}
        />
      </div>

      {/* RIGHT SIDE: PROFILE BUTTON */}
      <div className="flex items-center gap-4">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100">
            <div className="h-8 w-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold">
              {user?.name?.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-medium">{user?.name}</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* USER INFO */}
            <div className="px-3 py-2">
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-slate-600">{user?.email}</p>
              <p className="text-xs text-slate-400 mt-1">
                {user.role === "staff"
                  ? "Cafeteria Owner"
                  : user.role === "admin"
                  ? "Admin"
                  : "Customer"}
              </p>
            </div>

            <DropdownMenuSeparator />

            {/* ONLY STAFF CAN SEE CAFETERIA INFO */}
            {isStaff && (
              <DropdownMenuItem onClick={() => onNavigate("cafeteria-info")}>
                <Building2 className="w-4 h-4 mr-2" />
                Cafeteria Information
              </DropdownMenuItem>
            )}

            {isStaff && <DropdownMenuSeparator />}

            {/* REMOVE PROFILE SETTINGS FOR ADMIN ONLY */}
            {!isAdmin && (
              <>
                <DropdownMenuItem onClick={() => onNavigate("profile")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>

                <DropdownMenuSeparator />
              </>
            )}

            {/* LOGOUT */}
            <DropdownMenuItem
              onClick={onLogout}
              className="text-red-600 font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
