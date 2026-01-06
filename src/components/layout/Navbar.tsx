import { useEffect, useState } from "react";
import {
  Menu,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Settings,
  LogOut,
  Home,
  UtensilsCrossed,
  BarChart3,
  Building2,
  Mail,
} from "lucide-react";
import { Button } from "../ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.js";
import { Avatar, AvatarFallback } from "../ui/avatar.js";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet.js";
import { supabase } from "../../lib/supabaseClient";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: "customer" | "owner" | "admin";
  };
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: any) => void;
  cartCount?: number;
  onCartClick?: () => void;
}

interface NavbarInvitation {
  id: string;
  session_id: string;
  cafeteria_name: string;
  initiator_name: string;
  created_at: string;
}

export default function Navbar({
  user,
  onLogout,
  currentPage,
  onNavigate,
  cartCount = 0,
  onCartClick,
}: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<NavbarInvitation[]>([]);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const isOwner = user.role === "owner";
  const isAdmin = user.role === "admin";

  useEffect(() => {
    if (isOwner || isAdmin) return;
    let isMounted = true;

    const loadInvitations = async () => {
      try {
        const { data: resolvedEmail, error: resolvedError } =
          await supabase.rpc("current_user_email_resolved");
        if (resolvedError) {
          console.warn("Failed to resolve email:", resolvedError.message);
        }

        const possibleIdentifiers = Array.from(
          new Set(
            [
              resolvedEmail,
              user.email,
              user?.email,
              user?.name,
              user?.email?.toLowerCase(),
            ]
              .filter(Boolean)
              .map((value) => String(value).trim().toLowerCase())
          )
        );

        if (possibleIdentifiers.length === 0) {
          if (isMounted) setInvitations([]);
          return;
        }

        const { data, error } = await supabase
          .from("split_bill_participants")
          .select(
            `
            id, session_id, identifier, status, created_at,
            session:split_bill_sessions (
              id, status, initiator_user_id,
              cafeteria:cafeterias (name)
            )
          `
          )
          .in("identifier", possibleIdentifiers)
          .eq("status", "pending");

        if (error) {
          console.warn("Failed to load invitations:", error.message);
          return;
        }

        // Filter for active sessions only
        const activeInvitations = (data || []).filter(
          // @ts-ignore
          (row: any) => row.session?.status === "active"
        );

        if (activeInvitations.length === 0) {
          if (isMounted) setInvitations([]);
          return;
        }

        // Fetch initiator names
        const initiatorIds = Array.from(
          new Set(
            activeInvitations
              // @ts-ignore
              .map((row: any) => row.session?.initiator_user_id)
              .filter(Boolean)
          )
        );

        let initiatorMap: Record<string, string> = {};
        if (initiatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", initiatorIds);

          initiatorMap = (profiles || []).reduce((acc: any, p: any) => {
            acc[p.id] = p.name;
            return acc;
          }, {});
        }

        const mapped: NavbarInvitation[] = activeInvitations.map(
          (row: any) => ({
            id: row.id,
            session_id: row.session_id,
            cafeteria_name: row.session?.cafeteria?.name || "Cafeteria",
            initiator_name:
              initiatorMap[row.session?.initiator_user_id] || "Someone",
            created_at: row.created_at,
          })
        );

        if (isMounted) {
          setInvitations(mapped);
        }
      } catch (err) {
        console.warn("Failed to load invitations", err);
      }
    };

    loadInvitations();
    const interval = setInterval(loadInvitations, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOwner, isAdmin, user.email, user.name]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo + Mobile Menu Button */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onNavigate("dashboard")}
            >
              <img
                src="/UTMMunch-Logo.jpg"
                alt="UTMMunch Logo"
                className="h-10 w-auto"
              />
            </div>

            {/* Mobile Menu Sheet - positioned right after logo */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-4 mt-8">
                  <Button
                    variant={currentPage === "dashboard" ? "default" : "ghost"}
                    onClick={() => {
                      onNavigate("dashboard");
                      setOpen(false);
                    }}
                    className="w-full justify-start"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>

                  {isOwner ? (
                    <>
                      <Button
                        variant={
                          currentPage === "manage-menu" ? "default" : "ghost"
                        }
                        onClick={() => {
                          onNavigate("manage-menu");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <UtensilsCrossed className="w-4 h-4 mr-2" />
                        Manage Menu
                      </Button>
                      <Button
                        variant={
                          currentPage === "manage-orders" ? "default" : "ghost"
                        }
                        onClick={() => {
                          onNavigate("manage-orders");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Manage Orders
                      </Button>
                      <Button
                        variant={
                          currentPage === "queue-dashboard"
                            ? "default"
                            : "ghost"
                        }
                        onClick={() => {
                          onNavigate("queue-dashboard");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Queue Dashboard
                      </Button>
                      <Button
                        variant={
                          currentPage === "manage-payments"
                            ? "default"
                            : "ghost"
                        }
                        onClick={() => {
                          onNavigate("manage-payments");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Manage Payments
                      </Button>
                    </>
                  ) : isAdmin ? (
                    <>{/* Admin sees only dashboard here */}</>
                  ) : (
                    <>
                      <Button
                        variant={currentPage === "menu" ? "default" : "ghost"}
                        onClick={() => {
                          onNavigate("menu");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <Menu className="w-4 h-4 mr-2" />
                        Menu
                      </Button>
                      <Button
                        variant={currentPage === "orders" ? "default" : "ghost"}
                        onClick={() => {
                          onNavigate("orders");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        My Orders
                      </Button>
                      <Button
                        variant={
                          currentPage === "payment" ? "default" : "ghost"
                        }
                        onClick={() => {
                          onNavigate("payment");
                          setOpen(false);
                        }}
                        className="w-full justify-start"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Payment
                      </Button>
                      {/* Mobile Inbox Item */}
                      <div className="my-2 border-t pt-2">
                        <p className="px-4 text-sm font-medium text-slate-500 mb-2">
                          Inbox
                        </p>
                        {invitations.length === 0 ? (
                          <p className="px-4 text-sm text-slate-400">
                            No new notifications
                          </p>
                        ) : (
                          invitations.map((inv) => (
                            <Button
                              key={inv.id}
                              variant="ghost"
                              onClick={() => {
                                onNavigate("splitbill-invitations");
                                setOpen(false);
                              }}
                              className="w-full justify-start h-auto py-2"
                            >
                              <Mail className="w-4 h-4 mr-2 text-primary" />
                              <div className="flex flex-col items-start overflow-hidden">
                                <span className="text-sm truncate w-full">
                                  Split Bill: {inv.cafeteria_name}
                                </span>
                                <span className="text-xs text-slate-500 truncate w-full">
                                  From {inv.initiator_name}
                                </span>
                              </div>
                            </Button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  <div className="border-t pt-4 mt-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onNavigate("profile");
                        setOpen(false);
                      }}
                      className="w-full justify-start"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Profile Settings
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        onLogout();
                        setOpen(false);
                      }}
                      className="w-full justify-start text-red-600 hover:text-red-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant={currentPage === "dashboard" ? "default" : "ghost"}
              onClick={() => onNavigate("dashboard")}
              className={
                currentPage === "dashboard"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600"
                  : ""
              }
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {isOwner ? (
              <>
                <Button
                  variant={currentPage === "manage-menu" ? "default" : "ghost"}
                  onClick={() => onNavigate("manage-menu")}
                  className={
                    currentPage === "manage-menu"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Manage Menu
                </Button>
                <Button
                  variant={
                    currentPage === "manage-orders" ? "default" : "ghost"
                  }
                  onClick={() => onNavigate("manage-orders")}
                  className={
                    currentPage === "manage-orders"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Manage Orders
                </Button>
                <Button
                  variant={
                    currentPage === "queue-dashboard" ? "default" : "ghost"
                  }
                  onClick={() => onNavigate("queue-dashboard")}
                  className={
                    currentPage === "queue-dashboard"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Queue Dashboard
                </Button>
                <Button
                  variant={
                    currentPage === "manage-payments" ? "default" : "ghost"
                  }
                  onClick={() => onNavigate("manage-payments")}
                  className={
                    currentPage === "manage-payments"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Manage Payments
                </Button>
              </>
            ) : isAdmin ? (
              <>{/* Admin sees only dashboard link here */}</>
            ) : (
              <>
                <Button
                  variant={currentPage === "menu" ? "default" : "ghost"}
                  onClick={() => onNavigate("menu")}
                  className={
                    currentPage === "menu"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <Menu className="w-4 h-4 mr-2" />
                  Menu
                </Button>
                <Button
                  variant={currentPage === "orders" ? "default" : "ghost"}
                  onClick={() => onNavigate("orders")}
                  className={
                    currentPage === "orders"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  My Orders
                </Button>
                <Button
                  variant={currentPage === "payment" ? "default" : "ghost"}
                  onClick={() => onNavigate("payment")}
                  className={
                    currentPage === "payment"
                      ? "bg-gradient-to-r from-amber-600 to-orange-600"
                      : ""
                  }
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Payment
                </Button>
              </>
            )}
          </div>

          {/* User Menu - Desktop */}
          <div className="flex items-center gap-1">
            {!isAdmin && !isOwner && (
              <>
                {/* Inbox Icon - Direct Link */}
                <Button
                  variant="ghost"
                  className="relative"
                  onClick={() => onNavigate("splitbill-invitations")}
                >
                  <Mail className="w-5 h-5" />
                  {invitations.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-md bg-orange-600 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white transform translate-x-1 -translate-y-1">
                      {invitations.length}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="relative"
                  onClick={() => {
                    if (onCartClick) {
                      onCartClick();
                    } else {
                      onNavigate("cart-preview");
                    }
                  }}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-purple-600 text-white text-[11px] flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8 bg-gradient-to-br from-purple-600 to-pink-600">
                    <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {user.role === "owner"
                      ? "Cafeteria Owner"
                      : user.role === "admin"
                      ? "Admin"
                      : "Customer"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => onNavigate("cafeteria-info")}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Cafeteria Information
                  </DropdownMenuItem>
                )}
                {isOwner && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => onNavigate("profile")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
