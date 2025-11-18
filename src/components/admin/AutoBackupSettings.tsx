import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Database, AlertCircle, CheckCircle2, Loader2, Download, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import JSZip from "jszip";
import Papa from "papaparse";

const AutoBackupSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadBackupFiles();
  }, []);

  const loadBackupFiles = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('edufine-documents')
        .list('backups', {
          sortBy: { column: 'created_at', order: 'desc' },
          limit: 10
        });

      if (error) throw error;
      
      setBackupFiles(data || []);
      if (data && data.length > 0) {
        setLastBackup(data[0].created_at);
      }
    } catch (error) {
      console.error('Error loading backup files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testBackup = async () => {
    setIsTesting(true);
    try {
      // 1. Edge Function으로 JSON 백업 수행
      const { data, error } = await supabase.functions.invoke('auto-backup');

      if (error) throw error;

      if (!data.success) {
        toast.error('백업 실패: ' + (data.error || '알 수 없는 오류'));
        return;
      }

      // 2. CSV 파일로 전체 데이터 내보내기
      const zip = new JSZip();
      const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
      
      const tables = [
        "students",
        "teachers",
        "merits",
        "demerits",
        "monthly",
        "career_counseling",
        "email_history",
        "email_templates",
        "departments",
        "student_groups",
        "teacher_groups",
        "file_metadata"
      ] as const;

      let successCount = 0;
      let errorCount = 0;

      for (const tableName of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName as any)
            .select("*");

          if (tableError) {
            console.error(`Error fetching ${tableName}:`, tableError);
            errorCount++;
            continue;
          }

          if (tableData && tableData.length > 0) {
            const csv = Papa.unparse(tableData);
            zip.file(`${tableName}.csv`, csv);
            successCount++;
          } else {
            zip.file(`${tableName}.csv`, "");
            successCount++;
          }
        } catch (err) {
          console.error(`Error processing ${tableName}:`, err);
          errorCount++;
        }
      }

      // 백업 정보 파일 추가
      const backupInfo = {
        백업일시: new Date().toLocaleString("ko-KR"),
        관리자: user.email || user.name,
        테이블수: successCount,
        실패수: errorCount,
        버전: "1.0"
      };

      zip.file("backup_info.json", JSON.stringify(backupInfo, null, 2));

      // ZIP 파일 생성 및 다운로드
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `database_backup_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`백업 완료: JSON 백업 + ${successCount}개 테이블 CSV 다운로드`);
      if (errorCount > 0) {
        toast.warning(`${errorCount}개 테이블 내보내기 실패`);
      }
      
      await loadBackupFiles();
    } catch (error: any) {
      console.error('Backup test error:', error);
      toast.error('백업 테스트 실패: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('edufine-documents')
        .download(`backups/${fileName}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('백업 파일 다운로드 완료');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('다운로드 실패');
    }
  };

  const openRestoreDialog = (fileName: string) => {
    setSelectedBackupFile(fileName);
    setRestoreDialogOpen(true);
  };

  const restoreBackup = async () => {
    if (!selectedBackupFile) return;

    setIsRestoring(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const adminId = user.id;

      if (!adminId) {
        throw new Error("관리자 ID를 찾을 수 없습니다");
      }

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: { 
          backupFileName: selectedBackupFile,
          adminId 
        }
      });

      if (error) throw error;

      toast.success("백업 복원이 완료되었습니다. 페이지를 새로고침해주세요.");
      setRestoreDialogOpen(false);
      
      // 페이지 새로고침 권장
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("백업 복원 실패: " + (error as Error).message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">자동 백업 설정</h2>
        <p className="text-sm text-muted-foreground mt-1">
          데이터베이스 자동 백업 시스템 관리
        </p>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          백업 실행 시 서버에 JSON 백업이 저장되며, 모든 테이블의 데이터가 CSV 파일로 ZIP 압축되어 다운로드됩니다. (students.csv, teachers.csv 등 포함)
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            백업 스케줄
          </CardTitle>
          <CardDescription>
            정기적인 자동 백업 설정
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="space-y-1">
              <Label htmlFor="auto-backup" className="text-base font-semibold">
                자동 백업 활성화
              </Label>
              <p className="text-sm text-muted-foreground">
                매일 새벽 3시 자동 백업 실행
              </p>
            </div>
            <Switch
              id="auto-backup"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {lastBackup && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">마지막 백업</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(lastBackup).toLocaleString('ko-KR')}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-semibold">백업 스케줄</Label>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">실행 시간</span>
                <span className="font-medium">매일 03:00 AM</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">보관 기간</span>
                <span className="font-medium">30일</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <span className="text-muted-foreground">백업 형식</span>
                <span className="font-medium">JSON</span>
              </div>
            </div>
          </div>

          <Button
            onClick={testBackup}
            disabled={isTesting}
            variant="outline"
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                백업 및 CSV 다운로드 중...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                백업 실행 및 CSV 다운로드
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>백업 히스토리</CardTitle>
          <CardDescription>
            최근 백업 파일 목록 (최근 10개)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              로딩 중...
            </div>
          ) : backupFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              백업 파일이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {backupFiles.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.created_at).toLocaleString('ko-KR')} · 
                      {' '}{(file.metadata?.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => downloadBackup(file.name)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      다운로드
                    </Button>
                    <Button
                      onClick={() => openRestoreDialog(file.name)}
                      variant="destructive"
                      size="sm"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      복원
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>백업 복원 확인</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p className="text-destructive font-semibold">
                  ⚠️ 경고: 이 작업은 되돌릴 수 없습니다!
                </p>
                <p>
                  현재 데이터베이스의 모든 데이터가 삭제되고 선택한 백업 파일의 데이터로 완전히 대체됩니다.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm font-medium">복원할 백업:</p>
                  <p className="text-sm text-muted-foreground">{selectedBackupFile}</p>
                </div>
                <p className="text-sm">
                  정말로 이 백업을 복원하시겠습니까?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={restoreBackup}
              disabled={isRestoring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  복원 중...
                </>
              ) : (
                "복원 실행"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AutoBackupSettings;
