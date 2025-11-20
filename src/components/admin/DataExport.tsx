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
  const [isExportingSchema, setIsExportingSchema] = useState(false);

  const exportSchema = async () => {
    setIsExportingSchema(true);
    
    try {
      const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
      
      if (!user.id || user.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      // Fetch the database schema file
      const response = await fetch('/database-schema.sql');
      if (!response.ok) {
        throw new Error('스키마 파일을 찾을 수 없습니다');
      }

      const schemaSQL = await response.text();

      // Add header with admin info
      const headerSQL = `-- Database Schema Export
-- Generated: ${new Date().toLocaleString("ko-KR")}
-- Admin: ${user.email || user.name}

${schemaSQL}`;

      // Create and download file
      const blob = new Blob([headerSQL], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `database_schema_${timestamp}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("스키마가 다운로드되었습니다");
    } catch (error) {
      console.error("Schema export error:", error);
      toast.error("스키마 내보내기 중 오류가 발생했습니다");
    } finally {
      setIsExportingSchema(false);
    }
  };

  const exportAllData = async () => {
    setIsExporting(true);
    const zip = new JSZip();

    try {
      const user = JSON.parse(localStorage.getItem("auth_user") || "{}");
      
      if (!user.id || user.type !== "admin") {
        toast.error("관리자 권한이 필요합니다");
        return;
      }

      // Call edge function to get all data
      const response = await supabase.functions.invoke('export-all-data', {
        body: { adminId: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message || '데이터를 가져오는 중 오류가 발생했습니다');
      }

      const { data: exportData, metadata } = response.data;

      // Define column order for specific tables
      const tableColumns: Record<string, string[]> = {
        students: ["student_id", "name", "grade", "class", "number", "dept_code", "student_call", "gmail", "parents_call1", "parents_call2"],
        teachers: ["teacher_email", "name", "grade", "class", "dept_code", "call_t", "is_homeroom", "department", "subject"],
        merits: ["student_id", "teacher_id", "category", "reason", "score", "image_url", "created_at"],
        demerits: ["student_id", "teacher_id", "category", "reason", "score", "image_url", "created_at"],
        departments: ["code", "name"],
      };

      let processedCount = 0;

      // Process each table
      for (const [tableName, tableData] of Object.entries(exportData)) {
        if (Array.isArray(tableData) && tableData.length > 0) {
          // Apply column ordering if defined
          let processedData = tableData;
          if (tableColumns[tableName]) {
            processedData = tableData.map(row => {
              const orderedRow: any = {};
              tableColumns[tableName].forEach(col => {
                if (col in row) {
                  orderedRow[col] = row[col];
                }
              });
              return orderedRow;
            });
          }

          // Add BOM for Korean text support
          const BOM = "\uFEFF";
          const csv = Papa.unparse(processedData);
          zip.file(`${tableName}.csv`, BOM + csv);
          processedCount++;
        } else {
          // Include empty tables with header only
          const BOM = "\uFEFF";
          zip.file(`${tableName}.csv`, BOM);
          processedCount++;
        }
      }

      // Add backup info
      const backupInfo = {
        백업일시: new Date(metadata.exportDate).toLocaleString("ko-KR"),
        관리자: metadata.adminEmail,
        테이블수: processedCount,
        버전: "1.0"
      };

      zip.file("backup_info.json", JSON.stringify(backupInfo, null, 2));

      // Generate and download ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `school_data_backup_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${processedCount}개 테이블의 데이터가 성공적으로 내보내졌습니다`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("데이터 내보내기 중 오류가 발생했습니다");
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

      <Card>
        <CardHeader>
          <CardTitle>전체 테이블 스키마 내보내기</CardTitle>
          <CardDescription>
            데이터베이스의 모든 테이블 구조를 SQL 파일로 내보냅니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-sm">포함되는 스키마:</h3>
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
              <li>실제 데이터는 포함되지 않으며, 테이블 구조만 내보냅니다</li>
              <li>다른 데이터베이스에 동일한 구조를 생성할 때 사용할 수 있습니다</li>
              <li>스키마 문서화 및 백업 용도로 활용 가능합니다</li>
            </ul>
          </div>

          <Button
            onClick={exportSchema}
            disabled={isExportingSchema}
            className="w-full"
            size="lg"
          >
            {isExportingSchema ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                스키마 내보내는 중...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                전체 스키마 내보내기
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataExport;
