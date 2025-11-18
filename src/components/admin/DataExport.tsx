import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import JSZip from "jszip";
import Papa from "papaparse";

const DataExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportAllData = async () => {
    setIsExporting(true);
    const zip = new JSZip();

    try {
      const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
      
      if (!user.id) {
        throw new Error("관리자 로그인이 필요합니다");
      }

      // Set admin session for RLS
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      
      // 모든 테이블 목록
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
          const { data, error } = await supabase
            .from(tableName as any)
            .select("*");

          if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            errorCount++;
            continue;
          }

          if (data && data.length > 0) {
            // CSV로 변환
            const csv = Papa.unparse(data);
            zip.file(`${tableName}.csv`, csv);
            successCount++;
          } else {
            // 빈 테이블도 포함 (헤더만)
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

      toast.success(`백업 완료: ${successCount}개 테이블 내보내기 성공`);
      if (errorCount > 0) {
        toast.warning(`${errorCount}개 테이블 내보내기 실패`);
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("데이터 내보내기 실패");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">전체 데이터 백업</h2>
        <p className="text-sm text-muted-foreground mt-1">
          모든 테이블의 데이터를 CSV 파일로 내보내기
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>전체 데이터 내보내기</CardTitle>
          <CardDescription>
            데이터베이스의 모든 테이블을 CSV 형식으로 ZIP 파일로 압축하여 다운로드합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">포함되는 테이블:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>• 학생 정보 (students)</div>
              <div>• 교사 정보 (teachers)</div>
              <div>• 상점 기록 (merits)</div>
              <div>• 벌점 기록 (demerits)</div>
              <div>• 이달의 학생 (monthly)</div>
              <div>• 진로상담 (career_counseling)</div>
              <div>• 이메일 기록 (email_history)</div>
              <div>• 이메일 템플릿 (email_templates)</div>
              <div>• 학과 정보 (departments)</div>
              <div>• 학생 그룹 (student_groups)</div>
              <div>• 교사 그룹 (teacher_groups)</div>
              <div>• 파일 메타데이터 (file_metadata)</div>
            </div>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg space-y-2 border border-primary/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              💡 안내사항
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>모든 데이터가 CSV 파일로 변환되어 ZIP으로 압축됩니다</li>
              <li>백업 정보가 포함된 JSON 파일이 함께 생성됩니다</li>
              <li>데이터 양에 따라 시간이 소요될 수 있습니다</li>
              <li>정기적인 백업을 권장합니다</li>
            </ul>
          </div>

          <Button
            onClick={exportAllData}
            disabled={isExporting}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                데이터 내보내는 중...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                전체 데이터 내보내기
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExport;
