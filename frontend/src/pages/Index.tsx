import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Zap, BarChart3, FileCheck } from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "Evaluación Rápida",
    description: "Resultados en tiempo récord para que tomes decisiones ágiles.",
  },
  {
    icon: ShieldCheck,
    title: "Análisis Confiable",
    description: "Verificación crediticia exhaustiva basada en datos reales.",
  },
  {
    icon: BarChart3,
    title: "Reportes Detallados",
    description: "Informes completos descargables en formato CSV.",
  },
  {
    icon: FileCheck,
    title: "Gestión Centralizada",
    description: "Administra todas tus solicitudes desde un solo lugar.",
  },
];

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>EvalRisk</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Iniciar Sesión</Button>
            </Link>
            <Link to="/signup">
              <Button>Registrarse</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Evalúa el riesgo de tus inquilinos con{" "}
            <span className="text-primary">confianza</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Plataforma integral para la evaluación crediticia de inquilinos. 
            Sube documentos, solicita evaluaciones y recibe reportes detallados directamente en tu correo.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/signup">
              <Button size="lg" className="px-8 text-base">
                Comenzar Gratis
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="px-8 text-base">
                Ya tengo una cuenta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t bg-card py-20">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">
            ¿Por qué elegir EvalRisk?
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="flex flex-col items-center rounded-xl border bg-background p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EvalRisk. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default Index;
