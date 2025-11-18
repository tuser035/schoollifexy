import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Database, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AutoBackupSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [backupFiles, setBackupFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      const { data, error } = await supabase.functions.invoke('auto-backup');

      if (error) throw error;

      if (data.success) {
        toast.success('백업 테스트 성공!');
        await loadBackupFiles();
      } else {
        toast.error('백업 실패: ' + (data.error || '알 수 없는 오류'));
      }
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
          자동 백업은 매일 새벽 3시에 실행됩니다. 백업 파일은 JSON 형식으로 저장되며, 최근 30일간의 백업이 보관됩니다.
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
                백업 실행 중...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                백업 테스트 실행
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
                  <Button
                    onClick={() => downloadBackup(file.name)}
                    variant="ghost"
                    size="sm"
                  >
                    다운로드
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoBackupSettings;
