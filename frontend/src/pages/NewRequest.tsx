import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText } from "lucide-react";

const NewRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resultEmail, setResultEmail] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf"
      );
      if (newFiles.length !== Array.from(e.target.files).length) {
        toast({ title: "Solo se permiten archivos PDF", variant: "destructive" });
      }
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (files.length === 0) {
      toast({ title: "Debes subir al menos un documento PDF", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Create the evaluation request
      const { data: request, error: reqError } = await supabase
        .from("evaluation_requests")
        .insert({
          user_id: user.id,
          tenant_name: resultEmail.trim().split('@')[0] || "Desconocido",
          result_email: resultEmail.trim(),
          status: "pendiente",
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // Upload documents
      for (const file of files) {
        const filePath = `${user.id}/${request.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("evaluation-documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { error: docError } = await supabase
          .from("evaluation_documents")
          .insert({
            request_id: request.id,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
          });

        if (docError) throw docError;
      }

      toast({ title: "Solicitud creada exitosamente", description: "Tu solicitud ha sido enviada a evaluación." });
      navigate("/solicitudes");
    } catch (error: any) {
      toast({ title: "Error al crear solicitud", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Nueva Solicitud de Documentos a Evaluar</CardTitle>
          <CardDescription>
            Ingresa los siguientes datos para solicitar la evaluación crediticia de sus inquilinos.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="resultEmail">Correo para recibir resultados</Label>
              <Input
                id="resultEmail"
                type="email"
                value={resultEmail}
                onChange={(e) => setResultEmail(e.target.value)}
                required
                placeholder="resultados@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Documentos (PDF)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-primary/50"
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Haz clic para seleccionar archivos PDF
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-primary" />
                        {file.name}
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar a Evaluación"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default NewRequest;
