import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    columns: "student_id, dept_code, grade, class, number, name, gmail, student_call, parents_call1, parents_call2",
    color: "border-student-orange",
  },
  {
    name: "교사",
    table: "teachers",
    columns: "teacher_email, name, grade, class, dept_code, call_t, is_homeroom",
    color: "border-teacher-blue",
  },
  {
    name: "상점",
    table: "merits",
    columns: "student_id, teacher_email, category, reason, score",
    color: "border-merit-blue",
  },
  {
    name: "벌점",
    table: "demerits",
    columns: "student_id, teacher_email, category, reason, score",
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
        .select('code');
      
      // Create map with normalized (trimmed and lowercase) emails as keys
      const teacherMap = new Map(
        teachers?.map(t => [t.teacher_email?.trim().toLowerCase(), t.id]) || []
      );
      
      // Create set of valid department codes
      const validDeptCodes = new Set(
        departments?.map(d => d.code) || []
      );
      
      console.log('Available teacher emails:', Array.from(teacherMap.keys()));
      console.log('Valid department codes:', Array.from(validDeptCodes));

      // Parse header to support flexible column order
      const header = lines[0].split(",").map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
      const dataLines = lines.slice(1);
      const records: any[] = [];
      // Resolve column indices by header (fallback to legacy positions)
      const idx = {
        homeroom: {
          teacher_email: header.indexOf("teacher_email"),
          grade: header.indexOf("grade"),
          class: header.indexOf("class"),
          year: header.indexOf("year"),
        },
        points: { // for merits and demerits
          student_id: header.indexOf("student_id"),
          teacher_email: header.indexOf("teacher_email"),
          category: header.indexOf("category"),
          reason: header.indexOf("reason"),
          score: header.indexOf("score"),
        }
      } as const;
      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const lineNumber = i + 2; // Header is line 1, so data starts at line 2
        
        try {
          const values = line.split(",").map(v => v.trim());
          
          let record: any = {};
          
          if (table === "students") {
            const deptCode = values[1]?.trim() || null;
            record = {
              student_id: values[0],
              dept_code: (deptCode && validDeptCodes.has(deptCode)) ? deptCode : null,
              grade: parseInt(values[2]),
              class: parseInt(values[3]),
              number: parseInt(values[4]),
              name: values[5],
              gmail: values[6] || null,
              student_call: values[7] || null,
              parents_call1: values[8] || null,
              parents_call2: values[9] || null,
            };
          } else if (table === "teachers") {
            record = {
              teacher_email: values[0],
              name: values[1],
              grade: values[2] ? parseInt(values[2]) : null,
              class: values[3] ? parseInt(values[3]) : null,
              dept_code: values[4] || null,
              call_t: values[5],
              is_homeroom: values[6] === "true" || values[6] === "1",
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
            record = {
              code: values[0],
              name: values[1],
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
    </div>
  );
};

export default BulkUpload;
