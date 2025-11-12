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
    columns: "email, name, grade, class, dept_code, call_t, is_homeroom",
    color: "border-teacher-blue",
  },
  {
    name: "담임반",
    table: "homeroom",
    columns: "teacher_id, grade, class, year",
    color: "border-admin-green",
  },
  {
    name: "상점",
    table: "merits",
    columns: "student_id, teacher_id, category, reason, score",
    color: "border-merit-blue",
  },
  {
    name: "벌점",
    table: "demerits",
    columns: "student_id, teacher_id, category, reason, score",
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
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV 파일이 비어있거나 형식이 잘못되었습니다");
      }

      // Skip header and parse data
      const dataLines = lines.slice(1);
      const records: any[] = [];

      for (const line of dataLines) {
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
            email: values[0],
            name: values[1],
            grade: values[2] ? parseInt(values[2]) : null,
            class: values[3] ? parseInt(values[3]) : null,
            dept_code: values[4] || null,
            call_t: values[5],
            is_homeroom: values[6] === "true" || values[6] === "1",
          };
        } else if (table === "homeroom") {
          record = {
            teacher_id: values[0],
            grade: parseInt(values[1]),
            class: parseInt(values[2]),
            year: values[3] ? parseInt(values[3]) : new Date().getFullYear(),
          };
        } else if (table === "merits" || table === "demerits") {
          record = {
            student_id: values[0],
            teacher_id: values[1],
            category: values[2],
            reason: values[3] || null,
            score: values[4] ? parseInt(values[4]) : 1,
          };
        } else if (table === "departments") {
          record = {
            code: values[0],
            name: values[1],
          };
        }
        
        records.push(record);
      }

      const { error } = await supabase.from(table).insert(records);
      
      if (error) throw error;
      
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
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(config.table, file);
                  }}
                  disabled={uploading !== null}
                />
                <Button
                  type="button"
                  className="w-full"
                  disabled={uploading !== null}
                  onClick={() => {}}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading === config.table ? "업로드 중..." : "CSV 선택"}
                </Button>
              </label>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BulkUpload;
