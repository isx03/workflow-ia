import { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, FileText, Search, LogOut, ShieldCheck } from "lucide-react";

const navItems = [

];

export const AppLayout = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onClick}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${location.pathname === item.to
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
            }`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/solicitudes" className="flex items-center gap-2 font-bold text-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>EvalRisk</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLinks />
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-2 text-muted-foreground">
              <LogOut className="mr-1 h-4 w-4" /> Salir
            </Button>
          </nav>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="mt-6 flex flex-col gap-2">
                <NavLinks onClick={() => setOpen(false)} />
                <Button variant="ghost" size="sm" onClick={signOut} className="justify-start text-muted-foreground mt-4">
                  <LogOut className="mr-2 h-4 w-4" /> Salir
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
