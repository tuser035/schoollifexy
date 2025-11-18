import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw, Eye, Download, Edit2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileObject } from "@supabase/storage-js";

const StorageManager = () => {
  const [files, setFiles] = useState<FileObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [renameFile, setRenameFile] = useState<{ oldName: string; newName: string } | null>(null);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("관리자 인증이 필요합니다");
        return;
      }

      const parsedUser = JSON.parse(authUser);
      if (parsedUser.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      // evidence-photos 버킷의 모든 파일 조회
      const { data, error } = await supabase.storage
        .from("evidence-photos")
        .list("", {
          limit: 1000,
          sortBy: { column: "created_at", order: "desc" }
        });

      if (error) throw error;

      setFiles(data || []);
      toast.success(`${data?.length || 0}개의 파일을 불러왔습니다`);
    } catch (error: any) {
      toast.error(error.message || "파일 목록 조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileId) return;

    try {
      const { error } = await supabase.storage
        .from("evidence-photos")
        .remove([deleteFileId]);

      if (error) throw error;

      toast.success("파일이 삭제되었습니다");
      setDeleteFileId(null);
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || "파일 삭제에 실패했습니다");
    }
  };

  const handlePreviewFile = (fileName: string) => {
    const { data } = supabase.storage
      .from("evidence-photos")
      .getPublicUrl(fileName);

    setPreviewFile({ url: data.publicUrl, name: fileName });
  };

  const handleDownloadFile = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("evidence-photos")
        .download(fileName);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("파일 다운로드 완료");
    } catch (error: any) {
      toast.error(error.message || "파일 다운로드에 실패했습니다");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR");
  };

  const handleRenameFile = async () => {
    if (!renameFile || !renameFile.newName.trim()) return;

    try {
      // 새 파일명이 기존과 같으면 무시
      if (renameFile.oldName === renameFile.newName) {
        setRenameFile(null);
        return;
      }

      // 파일 다운로드
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("evidence-photos")
        .download(renameFile.oldName);

      if (downloadError) throw downloadError;

      // 새 이름으로 업로드
      const { error: uploadError } = await supabase.storage
        .from("evidence-photos")
        .upload(renameFile.newName, fileData, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 기존 파일 삭제
      const { error: deleteError } = await supabase.storage
        .from("evidence-photos")
        .remove([renameFile.oldName]);

      if (deleteError) throw deleteError;

      toast.success("파일명이 변경되었습니다");
      setRenameFile(null);
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || "파일명 변경에 실패했습니다");
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Storage 파일 관리</CardTitle>
          <Button onClick={loadFiles} disabled={isLoading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              저장된 파일이 없습니다
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
            <TableHead>파일명</TableHead>
            <TableHead>크기</TableHead>
            <TableHead>업로드 날짜</TableHead>
            <TableHead className="text-right w-[200px]">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.name}</TableCell>
                      <TableCell>{formatFileSize(file.metadata?.size)}</TableCell>
                      <TableCell>{formatDate(file.created_at)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {file.metadata?.mimetype?.startsWith("image/") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewFile(file.name)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadFile(file.name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRenameFile({ oldName: file.name, newName: file.name })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteFileId(file.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              <br />
              <span className="font-medium text-foreground mt-2 block">{deleteFileId}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 이미지 미리보기 다이얼로그 */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="flex justify-center">
              <img
                src={previewFile.url}
                alt={previewFile.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 파일명 변경 다이얼로그 */}
      <Dialog open={!!renameFile} onOpenChange={() => setRenameFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>파일명 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newFileName">새 파일명</Label>
              <Input
                id="newFileName"
                value={renameFile?.newName || ""}
                onChange={(e) => setRenameFile(prev => prev ? { ...prev, newName: e.target.value } : null)}
                placeholder="새 파일명을 입력하세요"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameFile(null)}>
                취소
              </Button>
              <Button onClick={handleRenameFile}>
                변경
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorageManager;
