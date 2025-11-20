import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type TableType = "students" | "teachers" | "departments" | "merits" | "demerits" | "monthly" | "career_counseling" | "email_templates" | "email_history" | "student_groups" | "teacher_groups" | "file_metadata";

interface TableConfig {
  name: string;
  table: TableType;
  columns: string;
  color: string;
}

const tables: TableConfig[] = [
  {
    name: "학생",
    table: "students",
    columns: "student_id, name, grade, class, number, dept_code, student_call, gmail, parents_call1, parents_call2, photo_url",
    color: "border-student-orange",
  },
  {
    name: "교사",
    table: "teachers",
    columns: "teacher_email, name, call_t, grade, class, dept_code, department, subject, is_homeroom, is_admin, photo_url",
    color: "border-teacher-blue",
  },
  {
    name: "학과",
    table: "departments",
    columns: "code, name",
    color: "border-monthly-green",
  },
  {
    name: "상점",
    table: "merits",
    columns: "student_id, teacher_id, category, reason, score, image_url, created_at",
    color: "border-merit-blue",
  },
  {
    name: "벌점",
    table: "demerits",
    columns: "student_id, teacher_id, category, reason, score, image_url, created_at",
    color: "border-demerit-orange",
  },
  {
    name: "월별 추천",
    table: "monthly",
    columns: "student_id, teacher_id, category, reason, year, month, image_url, created_at",
    color: "border-primary",
  },
  {
    name: "진로상담",
    table: "career_counseling",
    columns: "student_id, admin_id, counselor_name, counseling_date, content, attachment_url",
    color: "border-purple-500",
  },
  {
    name: "이메일 템플릿",
    table: "email_templates",
    columns: "admin_id, title, subject, body, template_type",
    color: "border-blue-500",
  },
  {
    name: "이메일 히스토리",
    table: "email_history",
    columns: "sender_id, sender_name, sender_type, recipient_email, recipient_name, recipient_student_id, subject, body, resend_email_id",
    color: "border-cyan-500",
  },
  {
    name: "학생 그룹",
    table: "student_groups",
    columns: "admin_id, group_name, student_ids",
    color: "border-orange-500",
  },
  {
    name: "교사 그룹",
    table: "teacher_groups",
    columns: "admin_id, group_name, teacher_ids",
    color: "border-indigo-500",
  },
  {
    name: "파일 메타데이터",
    table: "file_metadata",
    columns: "bucket_name, storage_path, original_filename, mime_type, file_size, uploaded_by",
    color: "border-gray-500",
  },
];

const BulkUpload = () => {
  const [uploading, setUploading] = useState<TableType | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAllData = async () => {
    if (!selectedTable) {
      toast.error("테이블을 선택해주세요");
      return;
    }

    setDeleting(true);
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        throw new Error("로그인이 필요합니다");
      }
      
      const user = JSON.parse(authUser);

      // Call RPC function to delete all data from the selected table
      const { data, error } = await supabase.rpc("admin_delete_all_from_table", {
        admin_id_input: user.id,
        table_name_input: selectedTable
      });

      if (error) {
        console.error("삭제 오류:", error);
        throw error;
      }

      toast.success(`${tables.find(t => t.table === selectedTable)?.name} 테이블의 ${data}개 데이터가 삭제되었습니다`);
      setShowDeleteDialog(false);
      setSelectedTable(null);
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error(error instanceof Error ? error.message : "데이터 삭제 실패");
    } finally {
      setDeleting(false);
    }
  };

  const handleFileUpload = async (table: TableType, file: File) => {
    setUploading(table);
    
    try {
      // Get admin user from localStorage and set session
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        throw new Error("로그인이 필요합니다");
      }
      
      const user = JSON.parse(authUser);
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      
      // Use PapaParse for CSV parsing
      const Papa = await import('papaparse');
      const text = await file.text();
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const records = results.data as any[];
            
            if (records.length === 0) {
              throw new Error("CSV 파일이 비어있습니다");
            }

            // Clean and prepare records for insertion
            const cleanRecords = records.map(record => {
              const cleaned: any = {};
              Object.keys(record).forEach(key => {
                const value = record[key];
                const trimmedKey = key.trim();
                
                // Skip 'id' field for merits, demerits, monthly to avoid duplicate key errors
                if (trimmedKey === 'id' && (table === 'merits' || table === 'demerits' || table === 'monthly')) {
                  return;
                }
                
                // Convert empty strings to null
                if (value === '' || value === null) {
                  cleaned[trimmedKey] = null;
                  return;
                }
                
                // Parse image_url field for merits, demerits, monthly tables
                if (trimmedKey === 'image_url' && (table === 'merits' || table === 'demerits' || table === 'monthly')) {
                  try {
                    // Check if it's a JSON string array
                    if (typeof value === 'string' && value.startsWith('[')) {
                      // Parse JSON string to actual array
                      cleaned[trimmedKey] = JSON.parse(value);
                    } else if (typeof value === 'string' && value.trim() !== '') {
                      // Single URL string, convert to array
                      cleaned[trimmedKey] = [value];
                    } else {
                      cleaned[trimmedKey] = null;
                    }
                  } catch (e) {
                    console.error('Failed to parse image_url:', value, e);
                    cleaned[trimmedKey] = null;
                  }
                }
                // Parse teacher_ids field for teacher_groups table
                else if (trimmedKey === 'teacher_ids' && table === 'teacher_groups') {
                  if (typeof value === 'string') {
                    // Split comma-separated string into array
                    cleaned[trimmedKey] = value.split(',').map(id => id.trim()).filter(id => id);
                  } else if (Array.isArray(value)) {
                    cleaned[trimmedKey] = value;
                  } else {
                    cleaned[trimmedKey] = null;
                  }
                }
                // Parse student_ids field for student_groups table
                else if (trimmedKey === 'student_ids' && table === 'student_groups') {
                  if (typeof value === 'string') {
                    // Split comma-separated string into array
                    cleaned[trimmedKey] = value.split(',').map(id => id.trim()).filter(id => id);
                  } else if (Array.isArray(value)) {
                    cleaned[trimmedKey] = value;
                  } else {
                    cleaned[trimmedKey] = null;
                  }
                }
                // Skip admin_id field for teacher_groups and student_groups - will be set to current user
                else if (trimmedKey === 'admin_id' && (table === 'teacher_groups' || table === 'student_groups')) {
                  return;
                }
                else {
                  cleaned[trimmedKey] = value;
                }
              });
              
              // Set admin_id to current user for teacher_groups and student_groups
              if (table === 'teacher_groups' || table === 'student_groups') {
                cleaned.admin_id = user.id;
              }
              
              return cleaned;
            });

            // Insert using upsert for students, teachers, departments
            let result;
            if (table === 'students') {
              result = await supabase.from(table).upsert(cleanRecords, { 
                onConflict: 'student_id',
                ignoreDuplicates: false 
              });
            } else if (table === 'teachers') {
              result = await supabase.from(table).upsert(cleanRecords, { 
                onConflict: 'teacher_email',
                ignoreDuplicates: false 
              });
            } else if (table === 'departments') {
              result = await supabase.from(table).upsert(cleanRecords, { 
                onConflict: 'code',
                ignoreDuplicates: false 
              });
            } else {
              // For other tables - just insert
              result = await supabase.from(table).insert(cleanRecords);
            }
            
            if (result.error) throw result.error;
            
            toast.success(`${records.length}개의 레코드가 성공적으로 업로드되었습니다`);
            setUploading(null);
          } catch (error: any) {
            console.error("Insert error:", error);
            toast.error(error.message || "업로드에 실패했습니다");
            setUploading(null);
          }
        },
        error: (error) => {
          console.error('CSV 파싱 오류:', error);
          toast.error('CSV 파일 파싱 중 오류가 발생했습니다');
          setUploading(null);
        },
      });
    } catch (error: any) {
      toast.error(error.message || "업로드에 실패했습니다");
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 데이터 삭제 섹션 */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            테이블 데이터 삭제
          </CardTitle>
          <CardDescription>
            선택한 테이블의 모든 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">삭제할 테이블 선택</label>
              <Select value={selectedTable || ""} onValueChange={(value) => setSelectedTable(value as TableType)}>
                <SelectTrigger>
                  <SelectValue placeholder="테이블을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.table} value={table.table}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={!selectedTable || deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              데이터 모두 삭제
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV 업로드 섹션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((config) => (
          <Card key={config.table} className={`border-2 ${config.color}`}>
            <CardHeader>
              <CardTitle>{config.name} 업로드</CardTitle>
              <CardDescription className="text-xs font-mono">
                {config.columns}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id={`upload-${config.table}`}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(config.table, file);
                    e.target.value = '';
                  }
                }}
                disabled={uploading !== null}
              />
              <Button
                type="button"
                className="w-full"
                disabled={uploading !== null}
                onClick={() => document.getElementById(`upload-${config.table}`)?.click()}
                asChild={false}
              >
                <span className="flex items-center justify-center">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading === config.table ? "업로드 중..." : "CSV 선택"}
                </span>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                <strong className="text-destructive">
                  {selectedTable && tables.find(t => t.table === selectedTable)?.name}
                </strong> 테이블의 모든 데이터가 영구적으로 삭제됩니다.
              </p>
              <p className="text-destructive font-semibold">
                이 작업은 되돌릴 수 없습니다!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BulkUpload;
