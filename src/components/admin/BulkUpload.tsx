import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type TableType = "edufine" | "students" | "teachers" | "merits" | "demerits" | "departments";

interface TableConfig {
  name: string;
  table: TableType;
  columns: string;
  color: string;
}

const tables: TableConfig[] = [
  {
    name: "에듀파인 문서",
    table: "edufine",
    columns: "rcv_date, due, dept, subj, doc_no, att1, att2, att3, att4, att5",
    color: "border-primary",
  },
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
    name: "학과",
    table: "departments",
    columns: "code, name",
    color: "border-monthly-green",
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
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });

      // Delete all records from the selected table
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error("삭제 오류:", error);
        throw new Error("데이터 삭제 중 오류가 발생했습니다");
      }

      toast.success(`${tables.find(t => t.table === selectedTable)?.name} 테이블의 모든 데이터가 삭제되었습니다`);
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
      // Handle Edufine document upload to storage and database
      if (table === "edufine") {
        // Get admin user from localStorage and set session
        const authUser = localStorage.getItem("auth_user");
        if (!authUser) {
          throw new Error("로그인이 필요합니다");
        }
        
        const user = JSON.parse(authUser);
        await supabase.rpc("set_admin_session", { admin_id_input: user.id });

        const timestamp = new Date().getTime();
        const fileName = `edufine_${timestamp}_${file.name}`;
        const filePath = `uploads/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('edufine-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("업로드 오류:", uploadError);
          throw new Error("파일 업로드 중 오류가 발생했습니다");
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('edufine-documents')
          .getPublicUrl(filePath);

        // Parse CSV and insert to database (handle UTF-8 and EUC-KR)
        const Papa = await import('papaparse');

        // Read as ArrayBuffer to support legacy encodings
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        const decodeWith = (enc: string) => {
          try {
            // @ts-ignore - euc-kr may not be in TS lib typings but is supported by modern browsers
            return new TextDecoder(enc).decode(uint8);
          } catch {
            return '';
          }
        };

        let text = decodeWith('utf-8');
        const looksValid = /접수일|발신부서|제목|생산문서번호|붙임/.test(text) || /rcv_date|dept|subj|doc_no/.test(text);
        if (!looksValid) {
          const alt = decodeWith('euc-kr');
          if (alt) text = alt;
        }

        const norm = (v: any) => (v === undefined || v === null ? null : String(v).trim());
        const parseDate = (v: any) => {
          const s = norm(v);
          if (!s) return null;
          const m = s.replace(/[./]/g, '-').match(/^(\d{4})[-](\d{1,2})[-](\d{1,2})$/);
          if (!m) return s; // keep as-is if unknown
          const [_, y, mo, d] = m;
          const pad = (n: string) => n.padStart(2, '0');
          return `${y}-${pad(mo)}-${pad(d)}`;
        };

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const records = (results.data as any[]).map((row) => ({
              rcv_date: parseDate(row.rcv_date ?? row['접수일']),
              due: parseDate(row.due ?? row['마감일']),
              dept: norm(row.dept ?? row['발신부서']),
              subj: norm(row.subj ?? row['제목']),
              doc_no: norm(row.doc_no ?? row['생산문서번호'] ?? row['문서번호']),
              att1: norm(row.att1 ?? row['붙임파일1'] ?? row['붙임파일명1']),
              att2: norm(row.att2 ?? row['붙임파일2'] ?? row['붙임파일명2']),
              att3: norm(row.att3 ?? row['붙임파일3'] ?? row['붙임파일명3']),
              att4: norm(row.att4 ?? row['붙임파일4'] ?? row['붙임파일명4']),
              att5: norm(row.att5 ?? row['붙임파일5'] ?? row['붙임파일명5']),
              file_url: publicUrl,
              admin_id: user.id,
            }));

            const { error: insertError } = await supabase
              .from('edufine_documents' as any)
              .insert(records);

            if (insertError) {
              console.error('데이터베이스 저장 오류:', insertError);
              throw new Error('데이터베이스 저장 중 오류가 발생했습니다');
            }

            toast.success(`${records.length}개의 에듀파인 문서가 성공적으로 저장되었습니다`);
            setUploading(null);
          },
          error: (error) => {
            console.error('CSV 파싱 오류:', error);
            throw new Error('CSV 파일 파싱 중 오류가 발생했습니다');
          },
        });

        return;
      }

      // Get admin user from localStorage and set session
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        throw new Error("로그인이 필요합니다");
      }
      
      const user = JSON.parse(authUser);
      await supabase.rpc("set_admin_session", { admin_id_input: user.id });
      
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV 파일이 비어있거나 형식이 잘못되었습니다");
      }

      // Pre-fetch all teachers for email → UUID conversion
      const { data: teachers } = await supabase
        .from('teachers')
        .select('id, teacher_email, grade, class');
      
      // Pre-fetch all students for merit/demerit teacher matching
      const { data: students } = await supabase
        .from('students')
        .select('student_id, grade, class');
      
      // Pre-fetch all departments for dept_code validation
      const { data: departments } = await supabase
        .from('departments')
        .select('code, name');
      
      // Create map with normalized (trimmed and lowercase) emails as keys
      const teacherMap = new Map(
        teachers?.map(t => [t.teacher_email?.trim().toLowerCase(), t.id]) || []
      );
      
      // Create map: dept name → code, and set of valid codes
      const deptNameToCode = new Map(
        departments?.map(d => [d.name?.trim(), d.code]) || []
      );
      
      // Add additional alias mappings for common variations
      deptNameToCode.set('글로벌경영', 'g');
      deptNameToCode.set('관광서비스', 't');
      deptNameToCode.set('스포츠마케팅', 's');
      deptNameToCode.set('유튜브창업', 'y');
      deptNameToCode.set('IT융합정보', 'i');
      
      const validDeptCodes = new Set(
        departments?.map(d => d.code) || []
      );
      
      console.log('Available teacher emails:', Array.from(teacherMap.keys()));
      console.log('Valid department codes:', Array.from(validDeptCodes));
      console.log('Department name mapping:', Array.from(deptNameToCode.entries()));

      // Parse header to support flexible column order
      const header = lines[0].split(",").map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
      const dataLines = lines.slice(1);
      const records: any[] = [];
      // Resolve column indices by header (fallback to legacy positions)
      const idx = {
        students: {
          student_id: header.indexOf("student_id") !== -1 ? header.indexOf("student_id") : header.indexOf("학번"),
          name: header.indexOf("name") !== -1 ? header.indexOf("name") : header.indexOf("이름"),
          grade: header.indexOf("grade") !== -1 ? header.indexOf("grade") : header.indexOf("학년"),
          class: header.indexOf("class") !== -1 ? header.indexOf("class") : header.indexOf("반"),
          number: header.indexOf("number") !== -1 ? header.indexOf("number") : header.indexOf("번호"),
          dept_code: header.indexOf("dept_code") !== -1 ? header.indexOf("dept_code") : header.indexOf("학과"),
          student_call: header.indexOf("student_call") !== -1 ? header.indexOf("student_call") : header.indexOf("전화번호"),
          gmail: header.indexOf("gmail") !== -1 ? header.indexOf("gmail") : header.indexOf("이메일"),
          parents_call1: header.indexOf("parents_call1") !== -1 ? header.indexOf("parents_call1") : header.indexOf("학부모전화1"),
          parents_call2: header.indexOf("parents_call2") !== -1 ? header.indexOf("parents_call2") : header.indexOf("학부모전화2"),
        },
        teachers: {
          teacher_email: header.indexOf("teacher_email") !== -1 ? header.indexOf("teacher_email") : header.indexOf("이메일"),
          name: header.indexOf("name") !== -1 ? header.indexOf("name") : header.indexOf("이름"),
          grade: header.indexOf("grade") !== -1 ? header.indexOf("grade") : header.indexOf("학년"),
          class: header.indexOf("class") !== -1 ? header.indexOf("class") : header.indexOf("반"),
          dept_code: header.indexOf("dept_code") !== -1 ? header.indexOf("dept_code") : header.indexOf("학과"),
          call_t: header.indexOf("call_t") !== -1 ? header.indexOf("call_t") : header.indexOf("전화번호"),
          is_homeroom: header.indexOf("is_homeroom") !== -1 ? header.indexOf("is_homeroom") : header.indexOf("담임여부"),
          department: header.indexOf("department") !== -1 ? header.indexOf("department") : header.indexOf("부서"),
          subject: header.indexOf("subject") !== -1 ? header.indexOf("subject") : header.indexOf("담당교과"),
        },
        homeroom: {
          teacher_email: header.indexOf("teacher_email"),
          grade: header.indexOf("grade"),
          class: header.indexOf("class"),
          year: header.indexOf("year"),
        },
        points: { // for merits and demerits
          student_id: header.indexOf("student_id") !== -1 ? header.indexOf("student_id") : header.indexOf("학번"),
          teacher_email: header.indexOf("teacher_email") !== -1 ? header.indexOf("teacher_email") : header.indexOf("교사이메일"),
          category: header.indexOf("category") !== -1 ? header.indexOf("category") : header.indexOf("구분"),
          reason: header.indexOf("reason") !== -1 ? header.indexOf("reason") : header.indexOf("사유"),
          score: header.indexOf("score") !== -1 ? header.indexOf("score") : header.indexOf("점수"),
        },
        departments: {
          code: header.indexOf("code") !== -1 ? header.indexOf("code") : header.indexOf("코드"),
          name: header.indexOf("name") !== -1 ? header.indexOf("name") : header.indexOf("이름"),
        }
      } as const;
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const lineNumber = i + 2; // Header is line 1, so data starts at line 2
        
        try {
          const values = line.split(",").map(v => v.trim());
          
          let record: any = {};
          
          if (table === "students") {
            const sIdx = idx.students;
            const deptInput = sIdx.dept_code !== -1 ? values[sIdx.dept_code]?.trim() : null;
            let deptCode = null;
            
            if (deptInput) {
              // Check if it's already a valid code
              if (validDeptCodes.has(deptInput)) {
                deptCode = deptInput;
              } else if (deptNameToCode.has(deptInput)) {
                // Convert name to code
                deptCode = deptNameToCode.get(deptInput);
              }
            }
            
            record = {
              student_id: sIdx.student_id !== -1 ? values[sIdx.student_id] : values[0],
              name: sIdx.name !== -1 ? values[sIdx.name] : values[1],
              grade: sIdx.grade !== -1 ? parseInt(values[sIdx.grade]) : parseInt(values[2]),
              class: sIdx.class !== -1 ? parseInt(values[sIdx.class]) : parseInt(values[3]),
              number: sIdx.number !== -1 ? parseInt(values[sIdx.number]) : parseInt(values[4]),
              dept_code: deptCode,
              student_call: sIdx.student_call !== -1 ? (values[sIdx.student_call] || null) : (values[6] || null),
              gmail: sIdx.gmail !== -1 ? (values[sIdx.gmail] || null) : (values[7] || null),
              parents_call1: sIdx.parents_call1 !== -1 ? (values[sIdx.parents_call1] || null) : (values[8] || null),
              parents_call2: sIdx.parents_call2 !== -1 ? (values[sIdx.parents_call2] || null) : (values[9] || null),
            };
          } else if (table === "teachers") {
            const tIdx = idx.teachers;
            record = {
              teacher_email: tIdx.teacher_email !== -1 ? values[tIdx.teacher_email] : values[0],
              name: tIdx.name !== -1 ? values[tIdx.name] : values[1],
              grade: tIdx.grade !== -1 ? (values[tIdx.grade] ? parseInt(values[tIdx.grade]) : null) : (values[2] ? parseInt(values[2]) : null),
              class: tIdx.class !== -1 ? (values[tIdx.class] ? parseInt(values[tIdx.class]) : null) : (values[3] ? parseInt(values[3]) : null),
              dept_code: tIdx.dept_code !== -1 ? (values[tIdx.dept_code] || null) : (values[4] || null),
              call_t: tIdx.call_t !== -1 ? values[tIdx.call_t] : values[5],
              is_homeroom: tIdx.is_homeroom !== -1 ? (values[tIdx.is_homeroom] === "true" || values[tIdx.is_homeroom] === "1" || values[tIdx.is_homeroom] === "담임") : (values[6] === "true" || values[6] === "1"),
              department: tIdx.department !== -1 ? (values[tIdx.department] || null) : (values[7] || null),
              subject: tIdx.subject !== -1 ? (values[tIdx.subject] || null) : (values[8] || null),
            };
          } else if (table === "merits" || table === "demerits") {
            const pIdx = idx.points;
            const studentId = pIdx.student_id !== -1 ? values[pIdx.student_id] : values[0];
            
            if (!studentId || !studentId.trim()) {
              throw new Error(`student_id 컬럼이 비어있습니다`);
            }
            
            const teacherEmailRaw = pIdx.teacher_email !== -1 ? values[pIdx.teacher_email] : values[1];
            const teacherEmail = teacherEmailRaw?.trim().toLowerCase();
            
            let teacherId: string | undefined;
            
            if (teacherEmail) {
              // If teacher_email is provided, use it
              teacherId = teacherMap.get(teacherEmail);
              if (!teacherId) {
                throw new Error(`교사 이메일 '${teacherEmailRaw}'을 찾을 수 없습니다`);
              }
            } else {
              // If teacher_email is empty, find teacher by student's grade and class
              const student = students?.find(s => s.student_id === studentId.trim());
              if (student) {
                const matchingTeacher = teachers?.find(t => t.grade === student.grade && t.class === student.class);
                if (matchingTeacher) {
                  teacherId = matchingTeacher.id;
                  console.log(`Found teacher for student ${studentId} (grade ${student.grade} class ${student.class}): ${matchingTeacher.teacher_email}`);
                } else {
                  throw new Error(`학생 ${studentId}의 담임교사를 찾을 수 없습니다 (${student.grade}학년 ${student.class}반)`);
                }
              } else {
                throw new Error(`학생 ID '${studentId}'를 찾을 수 없습니다`);
              }
            }
            
            record = {
              student_id: studentId.trim(),
              teacher_id: teacherId,
              category: pIdx.category !== -1 ? values[pIdx.category] : values[2],
              reason: (pIdx.reason !== -1 ? values[pIdx.reason] : values[3]) || null,
              score: (pIdx.score !== -1 ? values[pIdx.score] : values[4]) ? parseInt(pIdx.score !== -1 ? values[pIdx.score] : values[4]) : 1,
            };
          } else if (table === "departments") {
            const dIdx = idx.departments;
            record = {
              code: dIdx.code !== -1 ? values[dIdx.code] : values[0],
              name: dIdx.name !== -1 ? values[dIdx.name] : values[1],
            };
          }
          
          records.push(record);
        } catch (error: any) {
          throw new Error(`행 ${lineNumber}: ${error.message}`);
        }
      }

      // Use upsert to handle duplicate keys
      let result;
      if (table === "students") {
        result = await supabase.from(table).upsert(records, { onConflict: 'student_id' });
      } else if (table === "teachers") {
        result = await supabase.from(table).upsert(records, { onConflict: 'teacher_email' });
      } else if (table === "departments") {
        result = await supabase.from(table).upsert(records, { onConflict: 'code' });
      } else {
        // For merits, demerits, monthly - just insert (no unique constraint)
        result = await supabase.from(table).insert(records);
      }
      
      if (result.error) throw result.error;
      
      toast.success(`${records.length}개의 레코드가 성공적으로 업로드되었습니다`);
    } catch (error: any) {
      toast.error(error.message || "업로드에 실패했습니다");
    } finally {
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
