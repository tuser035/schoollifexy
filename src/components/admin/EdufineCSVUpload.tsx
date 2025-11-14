import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const EdufineCSVUpload = () => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    
    try {
      if (!file.name.endsWith('.csv')) {
        throw new Error("CSV 파일만 업로드 가능합니다");
      }

      // 파일명에 타임스탬프 추가
      const timestamp = new Date().getTime();
      const fileName = `edufine_${timestamp}_${file.name}`;
      const filePath = `uploads/${fileName}`;

      // 스토리지에 업로드
      const { error } = await supabase.storage
        .from('edufine-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("업로드 오류:", error);
        throw new Error("파일 업로드 중 오류가 발생했습니다");
      }

      toast.success(`에듀파인 파일이 성공적으로 업로드되었습니다`);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "업로드 중 오류가 발생했습니다");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="border-l-4 border-primary">
        <CardHeader>
          <CardTitle>에듀파인 문서</CardTitle>
          <CardDescription className="text-xs">
            접수일, 마감일, 발신부서, 제목, 생산문서번호, 붙임파일명1-5
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            style={{ display: "none" }}
            id="edufine-upload"
            disabled={uploading}
          />
          <Button
            onClick={() => document.getElementById("edufine-upload")?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "업로드 중..." : "CSV 업로드"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EdufineCSVUpload;
