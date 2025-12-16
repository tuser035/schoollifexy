import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, RefreshCw, Eye, Download, Trash } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileObject } from "@supabase/storage-js";

interface FileWithMetadata extends FileObject {
  originalFilename?: string;
}

const StorageManager = () => {
  const [files, setFiles] = useState<FileWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

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

      // 관리자용 storage 파일 목록 조회 함수 호출 (원본 파일명 포함)
      const { data: storageFiles, error: storageError } = await supabase.rpc(
        "admin_get_storage_files",
        {
          admin_id_input: parsedUser.id,
          bucket_name_input: "evidence-photos"
        }
      );

      if (storageError) throw storageError;

      // 파일 정보를 적절한 형식으로 변환
      const filesWithMetadata: FileWithMetadata[] = (storageFiles || []).map(file => ({
        ...file,
        metadata: file.metadata as Record<string, any>,
        buckets: null,
        originalFilename: file.original_filename
      }));

      setFiles(filesWithMetadata);
      toast.success(`${filesWithMetadata.length}개의 파일을 불러왔습니다`);
    } catch (error: any) {
      console.error("파일 로딩 오류:", error);
      toast.error(error.message || "파일 목록 조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileId) return;

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

      // Set admin session for RLS
      const { error: sessionError } = await supabase.rpc("set_admin_session", {
        admin_id_input: parsedUser.id
      });

      if (sessionError) {
        console.error("세션 설정 오류:", sessionError);
      }

      // Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from("evidence-photos")
        .remove([deleteFileId]);

      if (storageError) throw storageError;

      // 메타데이터 삭제
      const { error: metadataError } = await supabase
        .from("file_metadata")
        .delete()
        .eq("storage_path", deleteFileId)
        .eq("bucket_name", "evidence-photos");

      if (metadataError) {
        console.error("메타데이터 삭제 오류:", metadataError);
      }

      // 삭제 성공 시 즉시 상태 업데이트
      setFiles(prevFiles => prevFiles.filter(file => file.name !== deleteFileId));
      toast.success("파일이 삭제되었습니다");
      setDeleteFileId(null);
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

  const handleDeleteAll = async () => {
    if (files.length === 0) return;

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

      // Set admin session for RLS
      const { error: sessionError } = await supabase.rpc("set_admin_session", {
        admin_id_input: parsedUser.id
      });

      if (sessionError) {
        console.error("세션 설정 오류:", sessionError);
      }

      const fileCount = files.length;
      const fileNames = files.map(file => file.name);
      
      // Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from("evidence-photos")
        .remove(fileNames);

      if (storageError) throw storageError;

      // 모든 메타데이터 삭제
      const { error: metadataError } = await supabase
        .from("file_metadata")
        .delete()
        .eq("bucket_name", "evidence-photos")
        .in("storage_path", fileNames);

      if (metadataError) {
        console.error("메타데이터 삭제 오류:", metadataError);
      }

      // 삭제 성공 시 즉시 상태 업데이트
      setFiles([]);
      toast.success(`${fileCount}개의 파일이 삭제되었습니다`);
      setShowDeleteAllConfirm(false);
    } catch (error: any) {
      toast.error(error.message || "파일 삭제에 실패했습니다");
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

  useEffect(() => {
    loadFiles();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg shrink-0">Storage 파일 관리</CardTitle>
            <div className="flex flex-row gap-2 shrink-0">
              <Button 
                onClick={() => setShowDeleteAllConfirm(true)} 
                disabled={isLoading || files.length === 0} 
                variant="destructive"
                size="sm"
                className="text-xs px-2 sm:px-3"
              >
                <Trash className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">모두 삭제</span>
              </Button>
              <Button onClick={loadFiles} disabled={isLoading} variant="outline" size="sm" className="text-xs px-2 sm:px-3">
                <RefreshCw className={`h-4 w-4 sm:mr-2 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">새로고침</span>
              </Button>
            </div>
          </div>
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
                    <TableHead className="min-w-[120px] max-w-[200px]">파일명</TableHead>
                    <TableHead className="w-[70px] text-center">크기</TableHead>
                    <TableHead className="w-[90px] text-center">업로드</TableHead>
                    <TableHead className="w-[100px] text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="flex flex-col">
                          {file.originalFilename ? (
                            <>
                              <span className="text-xs truncate" title={file.originalFilename}>
                                {file.originalFilename}
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate" title={file.name}>
                                {file.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs truncate" title={file.name}>{file.name}</span>
                              <span className="text-[10px] text-amber-600">※ 원본명 없음</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-center whitespace-nowrap">
                        {formatFileSize(file.metadata?.size)}
                      </TableCell>
                      <TableCell className="text-[10px] text-center whitespace-nowrap">
                        {new Date(file.created_at).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                        <br />
                        {new Date(file.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {file.metadata?.mimetype?.startsWith("image/") && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handlePreviewFile(file.name)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => handleDownloadFile(file.name)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            onClick={() => setDeleteFileId(file.name)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
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

      {/* 모두 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>모든 파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 모든 파일({files.length}개)을 삭제하시겠습니까? 
              <br />
              <span className="font-medium text-destructive mt-2 block">이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              모두 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StorageManager;
