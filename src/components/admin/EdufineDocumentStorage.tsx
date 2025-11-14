import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  name: string;
  id: string;
  created_at: string;
  metadata?: {
    size?: number;
  };
}

const EdufineDocumentStorage = () => {
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('edufine-documents')
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error fetching files:', error);
        toast.error('파일 목록을 불러오는데 실패했습니다');
        return;
      }

      setFiles(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('파일 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('edufine-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('파일 업로드에 실패했습니다');
        return;
      }

      toast.success('파일이 업로드되었습니다');
      await fetchFiles();
      
      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('파일 업로드 중 오류가 발생했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('edufine-documents')
        .download(fileName);

      if (error) {
        console.error('Download error:', error);
        toast.error('파일 다운로드에 실패했습니다');
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('파일이 다운로드되었습니다');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('파일 다운로드 중 오류가 발생했습니다');
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm('이 파일을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase.storage
        .from('edufine-documents')
        .remove([fileName]);

      if (error) {
        console.error('Delete error:', error);
        toast.error('파일 삭제에 실패했습니다');
        return;
      }

      toast.success('파일이 삭제되었습니다');
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('파일 삭제 중 오류가 발생했습니다');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>에듀파인 문서 스토리지</CardTitle>
        <CardDescription>
          에듀파인 관련 문서를 업로드하고 관리합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file-upload">파일 업로드</Label>
          <Input
            id="file-upload"
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            업로드 중...
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>업로드된 파일 ({files.length}개)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '새로고침'
              )}
            </Button>
          </div>

          {files.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border rounded-md bg-muted/50">
              업로드된 파일이 없습니다
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-3 bg-muted/50">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 bg-background rounded-md border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.metadata?.size)} • {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                      title="다운로드"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.name)}
                      title="삭제"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EdufineDocumentStorage;
