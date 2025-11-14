import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EdufineCSVUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error("CSV 파일만 업로드 가능합니다");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("파일을 선택해주세요");
      return;
    }

    setUploading(true);

    try {
      // 파일명에 타임스탬프 추가
      const timestamp = new Date().getTime();
      const fileName = `edufine_${timestamp}_${selectedFile.name}`;
      const filePath = `uploads/${fileName}`;

      // 스토리지에 업로드
      const { data, error } = await supabase.storage
        .from('edufine-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("업로드 오류:", error);
        toast.error("파일 업로드 중 오류가 발생했습니다");
        return;
      }

      toast.success("파일이 성공적으로 업로드되었습니다");
      setSelectedFile(null);
      
      // input 초기화
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error("업로드 오류:", error);
      toast.error("파일 업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>에듀파인 문서 업로드</CardTitle>
        <CardDescription>CSV 파일을 스토리지에 업로드합니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="csvFile">CSV 파일 선택</Label>
          <Input
            id="csvFile"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="mt-2"
          />
          {selectedFile && (
            <div className="mt-2 flex items-center text-sm text-muted-foreground">
              <FileText className="w-4 h-4 mr-2" />
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              스토리지에 업로드
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EdufineCSVUpload;
