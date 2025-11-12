import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TableType = "students" | "teachers" | "homeroom" | "merits" | "demerits" | "departments";

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
    name: "담임반",
    table: "homeroom",
    columns: "teacher_email, grade, class, year",
    color: "border-admin-green",
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
        .select('id, teacher_email');
      
      // Create map with normalized (trimmed and lowercase) emails as keys
      const teacherMap = new Map(
        teachers?.map(t => [t.teacher_email?.trim().toLowerCase(), t.id]) || []
      );
      
      console.log('Available teacher emails:', Array.from(teacherMap.keys()));

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
            record = {
              student_id: values[0],
              dept_code: values[1] || null,
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
          } else if (table === "homeroom") {
            const tIdx = idx.homeroom;
            const teacherEmailRaw = tIdx.teacher_email !== -1 ? values[tIdx.teacher_email] : values[0];
            const teacherEmail = teacherEmailRaw?.trim().toLowerCase();
            console.log(`Looking for teacher email: "${teacherEmail}"`);
            if (!teacherEmail) {
              throw new Error(`teacher_email 컬럼이 비어있습니다`);
            }
            const teacherId = teacherMap.get(teacherEmail);
            if (!teacherId) {
              throw new Error(`교사 이메일 '${teacherEmailRaw}'을 찾을 수 없습니다`);
            }
            record = {
              teacher_id: teacherId,
              grade: parseInt(tIdx.grade !== -1 ? values[tIdx.grade] : values[1]),
              class: parseInt(tIdx.class !== -1 ? values[tIdx.class] : values[2]),
              year: (tIdx.year !== -1 ? values[tIdx.year] : values[3]) ? parseInt(tIdx.year !== -1 ? values[tIdx.year] : values[3]) : new Date().getFullYear(),
            };
          } else if (table === "merits" || table === "demerits") {
            const pIdx = idx.points;
            const teacherEmailRaw = pIdx.teacher_email !== -1 ? values[pIdx.teacher_email] : values[1];
            const teacherEmail = teacherEmailRaw?.trim().toLowerCase();
            console.log(`Looking for teacher email: "${teacherEmail}"`);
            if (!teacherEmail) {
              throw new Error(`teacher_email 컬럼이 비어있습니다`);
            }
            const teacherId = teacherMap.get(teacherEmail);
            if (!teacherId) {
              throw new Error(`교사 이메일 '${teacherEmailRaw}'을 찾을 수 없습니다`);
            }
            record = {
              student_id: pIdx.student_id !== -1 ? values[pIdx.student_id] : values[0],
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
      } else if (table === "homeroom") {
        result = await supabase.from(table).upsert(records, { onConflict: 'teacher_id,year' });
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
    </div>
  );
};

export default BulkUpload;
