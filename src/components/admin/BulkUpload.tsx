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
                let value = record[key];
                const trimmedKey = key.trim();
                
                // Skip 'id' field for merits, demerits, monthly to avoid duplicate key errors
                if (trimmedKey === 'id' && (table === 'merits' || table === 'demerits' || table === 'monthly')) {
                  return;
                }
                
                // Skip admin_id field for teacher_groups and student_groups - will be set to current user
                if (trimmedKey === 'admin_id' && (table === 'teacher_groups' || table === 'student_groups')) {
                  return;
                }
                
                // Trim string values
                if (typeof value === 'string') {
                  value = value.trim();
                }
                
                // UUID fields that must be null if empty (not empty string)
                const uuidFields = ['teacher_id', 'admin_id', 'student_id', 'uploaded_by', 'sender_id'];
                if (uuidFields.includes(trimmedKey)) {
                  // For UUID fields, convert any falsy value or empty string to null
                  if (!value || value === '' || value === null || value === undefined || 
                      (typeof value === 'string' && value.trim() === '')) {
                    cleaned[trimmedKey] = null;
                    return;
                  }
                }
                
                // Convert empty strings, null, undefined to null for other fields
                if (value === '' || value === null || value === undefined) {
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
                    } else if (typeof value === 'string') {
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

            console.log('Cleaned records for', table, ':', cleanRecords);
            console.log('Current user ID:', user.id);

            // Insert using different methods based on table type
            let result;
            if (table === 'students') {
              // Use RPC function for students to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_student', {
                  admin_id_input: user.id,
                  student_id_input: record.student_id,
                  name_input: record.name,
                  grade_input: record.grade,
                  class_input: record.class,
                  number_input: record.number,
                  dept_code_input: record.dept_code || null,
                  student_call_input: record.student_call || null,
                  gmail_input: record.gmail || null,
                  parents_call1_input: record.parents_call1 || null,
                  parents_call2_input: record.parents_call2 || null
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'teachers') {
              // Use RPC function for teachers to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_teacher', {
                  admin_id_input: user.id,
                  name_input: record.name,
                  call_t_input: record.call_t,
                  teacher_email_input: record.teacher_email,
                  grade_input: record.grade || null,
                  class_input: record.class || null,
                  is_homeroom_input: record.is_homeroom || false,
                  is_admin_input: record.is_admin || false,
                  dept_code_input: record.dept_code || null,
                  department_input: record.department || null,
                  subject_input: record.subject || null
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'teacher_groups') {
              // Use RPC function for teacher groups to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_teacher_group', {
                  admin_id_input: user.id,
                  group_name_input: record.group_name,
                  teacher_ids_input: record.teacher_ids
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'student_groups') {
              // Use RPC function for student groups to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_student_group', {
                  admin_id_input: user.id,
                  group_name_input: record.group_name,
                  student_ids_input: record.student_ids
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'departments') {
              // Use RPC function for departments to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_department', {
                  admin_id_input: user.id,
                  code_input: record.code,
                  name_input: record.name
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'career_counseling') {
              // Use RPC function for career counseling to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_career_counseling', {
                  admin_id_input: user.id,
                  student_id_input: record.student_id,
                  counselor_name_input: record.counselor_name,
                  counseling_date_input: record.counseling_date,
                  content_input: record.content,
                  attachment_url_input: record.attachment_url || null
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'email_templates') {
              // Use RPC function for email templates to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_email_template_bulk', {
                  admin_id_input: user.id,
                  title_input: record.title,
                  subject_input: record.subject,
                  body_input: record.body,
                  template_type_input: record.template_type || 'email'
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'email_history') {
              // Use RPC function for email history to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_email_history', {
                  admin_id_input: user.id,
                  sender_id_input: record.sender_id || user.id,
                  sender_name_input: record.sender_name,
                  sender_type_input: record.sender_type,
                  recipient_email_input: record.recipient_email,
                  recipient_name_input: record.recipient_name,
                  recipient_student_id_input: record.recipient_student_id || null,
                  subject_input: record.subject,
                  body_input: record.body,
                  resend_email_id_input: record.resend_email_id || null
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else if (table === 'file_metadata') {
              // Use RPC function for file metadata to handle RLS properly
              const results = [];
              for (const record of cleanRecords) {
                const { data, error } = await supabase.rpc('admin_insert_file_metadata', {
                  admin_id_input: user.id,
                  bucket_name_input: record.bucket_name,
                  storage_path_input: record.storage_path,
                  original_filename_input: record.original_filename,
                  mime_type_input: record.mime_type || null,
                  file_size_input: record.file_size ? parseInt(record.file_size) : null,
                  uploaded_by_input: record.uploaded_by || user.id
                });
                if (error) throw error;
                results.push(data);
              }
              result = { data: results, error: null };
            } else {
              // For other tables - INSERT 직전 최종 UUID 필드 검증
              const finalCleanRecords = cleanRecords.map(record => {
                const final = { ...record };
                
                // 모든 필드를 순회하면서 UUID 필드 검증
                Object.keys(final).forEach(key => {
                  // UUID 필드로 의심되는 필드들 (id로 끝나거나 특정 이름)
                  const isUuidField = key.endsWith('_id') || 
                                     ['teacher_id', 'admin_id', 'student_id', 'uploaded_by', 'sender_id', 'id'].includes(key);
                  
                  if (isUuidField) {
                    let value = final[key];
                    
                    // 문자열인 경우 trim
                    if (typeof value === 'string') {
                      value = value.trim();
                    }
                    
                    // 빈 값이거나 공백만 있는 경우 null로 변환
                    if (!value || value === '' || value === null || value === undefined ||
                        (typeof value === 'string' && (value.trim() === '' || value === '""' || value === "''"))) {
                      final[key] = null;
                    } else {
                      final[key] = value;
                    }
                  }
                });
                
                return final;
              });
              
              console.log(`[${table}] Final cleaned records before insert:`, JSON.stringify(finalCleanRecords, null, 2));
              result = await supabase.from(table).insert(finalCleanRecords);
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
