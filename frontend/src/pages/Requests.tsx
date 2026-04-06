import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download } from "lucide-react";

interface EvaluationRequest {
  id: string;
  tenant_name: string;
  tenant_dni?: string;
  status: string;
  result_email: string;
  created_at: string;
  score: number | null;
}

const Requests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<EvaluationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    if (!user) return;
    const fetchRequests = async () => {
      const { data } = await supabase
        .from("evaluation_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRequests(data ?? []);
      setLoading(false);
    };
    fetchRequests();
  }, [user]);

  const getEvaluationResult = (score: number | null) => {
    if (score === null) return { text: "Pendiente", variant: "secondary" as const };
    if (score >= 70) return { text: "Aprobado", variant: "default" as const };
    return { text: "Rechazado", variant: "destructive" as const };
  };

  const filtered = requests.filter((r) => {
    const matchSearch = r.tenant_name.toLowerCase().includes(search.toLowerCase());
    const resultText = getEvaluationResult(r.score).text.toLowerCase();
    const matchStatus = statusFilter === "todos" || resultText === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDownloadCSV = () => {
    if (filtered.length === 0) return;

    const headers = ["Inquilino", "DNI", "Fecha", "Email", "Estado", "Resultado"];
    const csvContent = [
      headers.join(","),
      ...filtered.map(r => {
        const result = getEvaluationResult(r.score).text;
        return `"${r.tenant_name}","${r.tenant_dni || "-"}","${new Date(r.created_at).toLocaleDateString("es-ES")}","${r.result_email}","${r.status}","${result}"`;
      })
    ].join("\n");

    // Agregamos BOM para que Excel lea correctamente tildes y caracteres en UTF-8
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inquilinos_evaluados.csv");
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
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
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
              {requests.length === 0 ? "No tienes solicitudes aún." : "No se encontraron resultados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inquilino</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Resultado de evaluación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const result = getEvaluationResult(r.score);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.tenant_name}</TableCell>
                        <TableCell>{r.tenant_dni || "-"}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString("es-ES")}</TableCell>
                        <TableCell>
                          <Badge variant={result.variant}>{result.text}</Badge>
                        </TableCell>
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
