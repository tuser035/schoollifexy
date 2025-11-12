import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search, Camera, Upload, X } from "lucide-react";

interface Student {
  id: string;
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
}

const categories = [
  { value: "봉사", label: "봉사" },
  { value: "선행", label: "선행" },
  { value: "효행", label: "효행" },
];

const MonthlyForm = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = students.filter(s => 
        s.name.includes(searchTerm) || 
        s.student_id.includes(searchTerm) ||
        `${s.grade}${s.class}${s.number}`.includes(searchTerm)
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("id, student_id, name, grade, class, number")
      .order("grade")
      .order("class")
      .order("number");

    if (error) {
      toast.error("학생 목록을 불러오는데 실패했습니다");
      return;
    }

    setStudents(data || []);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !selectedCategory || !reason.trim()) {
      toast.error("모든 항목을 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        throw new Error("로그인이 필요합니다");
      }

      const user = JSON.parse(authUser);
      await supabase.rpc("set_teacher_session", { teacher_id_input: user.id });

      let imageUrl = null;

      // Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence-photos')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('evidence-photos')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const now = new Date();
      const { data, error } = await supabase.rpc('insert_monthly_recommendation', {
        student_id_input: selectedStudent.student_id,
        teacher_id_input: user.id,
        category_input: selectedCategory,
        reason_input: reason.trim(),
        image_url_input: imageUrl,
        year_input: now.getFullYear(),
        month_input: now.getMonth() + 1,
      });

      if (error) throw error;

      toast.success(`${selectedStudent.name} 학생을 이달의 학생으로 추천했습니다`);
      
      // Reset form
      setSelectedStudent(null);
      setSearchTerm("");
      setSelectedCategory("");
      setReason("");
      handleRemoveImage();
    } catch (error: any) {
      toast.error(error.message || "추천에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student Search */}
      <div className="space-y-2">
        <Label>학생 검색</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="학생 이름, 학번으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {filteredStudents.length > 0 && (
          <Card className="mt-2">
            <CardContent className="p-2 max-h-60 overflow-y-auto">
              {filteredStudents.map((student) => (
                <Button
                  key={student.id}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => {
                    setSelectedStudent(student);
                    setSearchTerm("");
                    setFilteredStudents([]);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{student.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({student.grade}학년 {student.class}반 {student.number}번)
                    </span>
                    <span className="text-xs text-muted-foreground">{student.student_id}</span>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {selectedStudent && (
        <Card className="bg-monthly-green/10 border-monthly-green">
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-semibold text-monthly-green">선택된 학생:</span>{" "}
              {selectedStudent.name} ({selectedStudent.grade}학년 {selectedStudent.class}반 {selectedStudent.number}번)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      <div className="space-y-2">
        <Label>추천 구분</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="추천 구분 선택" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reason Input */}
      {selectedCategory && (
        <div className="space-y-2">
          <Label>추천 사유</Label>
          <Textarea
            placeholder="추천 사유를 입력하세요..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {reason.length}/500
          </p>
        </div>
      )}

      {/* Image Upload */}
      {selectedCategory && (
        <div className="space-y-2">
          <Label>증빙 사진 (선택사항)</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1"
            >
              <Camera className="mr-2 h-4 w-4" />
              카메라로 촬영
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              파일 선택
            </Button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreview && (
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="증빙 사진"
                    className="w-full h-48 object-cover rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-monthly-green hover:bg-monthly-green/90"
        disabled={!selectedStudent || !selectedCategory || !reason.trim() || isSubmitting}
      >
        {isSubmitting ? "추천 중..." : "이달의 학생 추천"}
      </Button>
    </form>
  );
};

export default MonthlyForm;
