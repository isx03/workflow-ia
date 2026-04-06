import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText } from "lucide-react";

interface EvalRequest {
  id: string;
  tenant_name: string;
  status: string;
  result_email: string;
  created_at: string;
  score: number | null;
  result_notes: string | null;
}

interface EvalDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
}

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<EvalRequest | null>(null);
  const [documents, setDocuments] = useState<EvalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
  }, [id]);

  const downloadCsv = () => {
    if (!request) return;
    const headers = ["Campo", "Valor"];
    const rows = [
      ["ID", request.id],
      ["Inquilino", request.tenant_name],
      ["Estado", request.status],
      ["Email de resultados", request.result_email],
      ["Fecha de solicitud", new Date(request.created_at).toLocaleDateString("es-ES")],
      ["Score", request.score?.toString() ?? "Pendiente"],
      ["Notas", request.result_notes ?? "Sin notas"],
      ["Documentos", documents.map((d) => d.file_name).join("; ")],
    ];

    const csvContent = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evaluacion_${request.tenant_name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Solicitud no encontrada.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/solicitudes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Volver a solicitudes
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{request.tenant_name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Solicitado el {new Date(request.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>
          <Badge variant={request.status === "completado" ? "default" : "secondary"}>
            {request.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email de resultados</p>
              <p>{request.result_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Score</p>
              <p className="text-lg font-semibold">
                {request.score != null ? `${request.score}/100` : "Pendiente"}
              </p>
            </div>
          </div>

          {request.result_notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notas del evaluador</p>
              <p className="mt-1 rounded-lg bg-muted p-3 text-sm">{request.result_notes}</p>
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Documentos ({documents.length})
            </p>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin documentos.</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="flex-1 truncate">{doc.file_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(doc.file_size / 1024).toFixed(0)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button onClick={downloadCsv} variant="outline" className="w-full">
            <Download className="mr-2 h-4 w-4" /> Descargar reporte CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestDetail;
