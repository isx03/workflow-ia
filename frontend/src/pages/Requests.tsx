import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import workflowApi from "@/lib/workflowApi";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download } from "lucide-react";

interface EvaluationResult {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  capacidad_pago: string | number;
  evaluacion_general: string;
  nivel_riesgo: string;
  recomendacion: string;
  justificacion: string;
  createdAt: string;
}

const recomendacionStyle = (value: string): { label: string; className: string } => {
  const upper = value.toUpperCase();
  if (upper === "APROBADO") {
    return { label: "APROBADO", className: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" };
  }
  if (upper === "APROBADO_CON_CONDICIONES") {
    return { label: "APROBADO CON CONDICIONES", className: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" };
  }
  if (upper === "RECHAZADO") {
    return { label: "RECHAZADO", className: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" };
  }
  return { label: value, className: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" };
};

const Requests = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  useEffect(() => {
    if (!user) return;
    const fetchResults = async () => {
      try {
        const { data } = await workflowApi.get("/results");
        setResults(data.results ?? []);
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [user]);

  const filtered = results.filter((r) => {
    const fullName = `${r.nombres} ${r.apellidos}`.toLowerCase();
    const dni = (r.dni || "").toLowerCase();
    const term = search.toLowerCase();
    const matchSearch = fullName.includes(term) || dni.includes(term);
    const matchStatus =
      statusFilter === "TODOS" || r.recomendacion.toUpperCase() === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDownloadCSV = () => {
    if (filtered.length === 0) return;

    const headers = ["Nombres", "Apellidos", "DNI", "Capacidad de Pago", "Evaluación General", "Nivel de Riesgo", "Recomendación", "Justificación", "Fecha"];
    const csvContent = [
      headers.join(","),
      ...filtered.map((r) => {
        const rec = r.recomendacion.replace(/_/g, " ");
        return `"${r.nombres}","${r.apellidos}","${r.dni}","${r.capacidad_pago}","${r.evaluacion_general}","${r.nivel_riesgo}","${rec}","${r.justificacion}","${r.createdAt}"`;
      }),
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "evaluaciones.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Inquilinos evaluados</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDownloadCSV} disabled={filtered.length === 0}>
            <Download className="mr-1 h-4 w-4" /> Descargar CSV
          </Button>
          <Link to="/solicitudes/nueva">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Nueva Solicitud
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Recomendación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
                <SelectItem value="APROBADO_CON_CONDICIONES">Aprobado con condiciones</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {results.length === 0 ? "No tienes evaluaciones aún." : "No se encontraron resultados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Capacidad de Pago</TableHead>
                    <TableHead>Evaluación General</TableHead>
                    <TableHead>Nivel de Riesgo</TableHead>
                    <TableHead>Recomendación</TableHead>
                    <TableHead>Justificación</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const rec = recomendacionStyle(r.recomendacion);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nombres}</TableCell>
                        <TableCell>{r.apellidos}</TableCell>
                        <TableCell>{r.dni}</TableCell>
                        <TableCell>{r.capacidad_pago}</TableCell>
                        <TableCell>{r.evaluacion_general}</TableCell>
                        <TableCell>{r.nivel_riesgo}</TableCell>
                        <TableCell>
                          <span className={rec.className}>{rec.label}</span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={r.justificacion}>
                          {r.justificacion}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.createdAt}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Requests;
