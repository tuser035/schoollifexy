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

interface MeritCategory {
  category: string;
  reasons: { reason: string; score: number }[];
}

const meritCategories: MeritCategory[] = [
  {
    category: "환경미화 및 봉사활동",
    reasons: [
      { reason: "교실 환경미화에 적극 참여한 학생", score: 1 },
      { reason: "방과후 청소 활동 참여", score: 1 },
      { reason: "청소 및 주번 활동을 잘한 학생", score: 1 },
      { reason: "낙서지 우기", score: 1 },
      { reason: "대외 봉사활동에 헌신적이고 적극적일 때", score: 2 },
      { reason: "학급을 위한 봉사활동(학급회 추천, 월 3명 이내, 담임)", score: 1 },
      { reason: "학교 행사 시 봉사활동", score: 2 },
      { reason: "학교 전체를 위한 봉사활동", score: 2 },
    ]
  },
  {
    category: "고발 및 신고활동",
    reasons: [
      { reason: "외부인 교실 무단 출입 신고", score: 3 },
      { reason: "분실물 습득 및 신고", score: 3 },
      { reason: "비품, 공공기물의 훼손 행위 신고", score: 3 },
      { reason: "학생 관련 사건 및 사고의 신고", score: 5 },
      { reason: "학교 폭력, 금품 갈취 신고", score: 5 },
    ]
  },
  {
    category: "수상 및 명예 선양",
    reasons: [
      { reason: "학교의 명예 선양", score: 5 },
      { reason: "봉사, 모범, 선행 관련 학교장 상 수상", score: 3 },
      { reason: "외부 기관의 봉사, 모범, 선행 관련 상 수상", score: 3 },
      { reason: "시·군 단위 이상의 기관장 상 수상", score: 3 },
      { reason: "장관·대통령상 수상", score: 5 },
    ]
  },
  {
    category: "선행 및 모범학생",
    reasons: [
      { reason: "어려운 학우에게 도움을 주었을 때", score: 2 },
      { reason: "예절 바른 행동을 하였을 때", score: 1 },
      { reason: "용의 복장이 단정하여 다른 학생의 모범이 되었을 때", score: 1 },
      { reason: "불우 이웃 돕기에 적극 참여", score: 1 },
      { reason: "거동 불편 학우 등교 보조", score: 2 },
    ]
  },
  {
    category: "수업 태도",
    reasons: [
      { reason: "과제 및 수업 준비를 잘 해오는 학생", score: 2 },
      { reason: "수업 중 능동적으로 발표를 잘하는 학생", score: 2 },
      { reason: "수업 태도가 바람직하여 다른 학생의 모범이 될 때", score: 3 },
    ]
  },
  {
    category: "기타",
    reasons: [
      { reason: "기타 모범적인 행위를 했을 때나 자격증 취득 시", score: 1 },
      { reason: "기타 모범적인 행위를 했을 때나 자격증 취득 시", score: 2 },
      { reason: "기타 모범적인 행위를 했을 때나 자격증 취득 시", score: 3 },
      { reason: "기타 모범적인 행위를 했을 때나 자격증 취득 시", score: 5 },
    ]
  }
];

interface Student {
  id: string;
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
}

const MeritForm = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedReasonIndex, setSelectedReasonIndex] = useState("");
  const [basicReason, setBasicReason] = useState("");
  const [additionalReason, setAdditionalReason] = useState("");
  const [selectedScore, setSelectedScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      const filtered = students.filter(s => {
        // 이름 검색
        if (s.name.includes(term)) return true;
        
        // 학번 검색
        if (s.student_id.includes(term)) return true;
        
        // 학년반번호 검색 (예: "1", "101", "10105", "1-1", "1-1-5")
        const gradeStr = s.grade.toString();
        const classStr = s.class.toString().padStart(2, '0');
        const numberStr = s.number.toString().padStart(2, '0');
        
        // 단순 숫자 검색
        if (gradeStr === term) return true; // 학년만
        if (s.class.toString() === term) return true; // 반만
        if (s.number.toString() === term) return true; // 번호만
        
        // 연속 검색 (101, 10105 등)
        const continuous = `${gradeStr}${classStr}${numberStr}`;
        if (continuous.includes(term)) return true;
        
        // 하이픈 검색 (1-1, 1-1-5 등)
        const withDash = `${gradeStr}-${s.class}-${s.number}`;
        if (withDash.includes(term)) return true;
        
        return false;
      });
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_students", {
        admin_id_input: user.id,
        search_text: null,
        search_grade: null,
        search_class: null
      });

      if (error) {
        console.error("Error fetching students:", error);
        toast.error("학생 목록을 불러오는데 실패했습니다");
        return;
      }

      // Transform data to match Student interface
      const transformedData = (data || []).map((s: any) => ({
        id: s.student_id, // Using student_id as id for consistency
        student_id: s.student_id,
        name: s.name,
        grade: s.grade,
        class: s.class,
        number: s.number
      }));

      setStudents(transformedData);
    } catch (error: any) {
      console.error("Error in fetchStudents:", error);
      toast.error("학생 목록을 불러오는데 실패했습니다");
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedReasonIndex("");
    setBasicReason("");
    setAdditionalReason("");
    setSelectedScore(0);
  };

  const handleReasonChange = (reasonIndex: string) => {
    setSelectedReasonIndex(reasonIndex);
    const categoryData = meritCategories.find(c => c.category === selectedCategory);
    if (categoryData) {
      const idx = parseInt(reasonIndex);
      const reason = categoryData.reasons[idx];
      if (reason) {
        setBasicReason(reason.reason);
        setSelectedScore(reason.score);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageLoading(true);
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
          setImageLoading(false);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || !selectedCategory || !basicReason) {
      toast.error("모든 항목을 선택해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) {
        throw new Error("로그인이 필요합니다");
      }

      const user = JSON.parse(authUser);

      // Set teacher session for RLS policies
      await supabase.rpc('set_teacher_session', {
        teacher_id_input: user.id
      });

      let imageUrls: string[] = [];

      // Upload images if exist
      if (imageFiles.length > 0) {
        console.log('Starting upload for', imageFiles.length, 'files');
        for (const imageFile of imageFiles) {
          console.log('Uploading file:', imageFile.name, 'Size:', imageFile.size, 'Type:', imageFile.type);
          
          // Convert file to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
          });

          // Upload via edge function
          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-evidence-photo', {
            body: {
              teacher_id: user.id,
              filename: imageFile.name,
              file_base64: base64,
              content_type: imageFile.type,
              file_size: imageFile.size
            }
          });

          if (uploadError || !uploadData?.ok) {
            console.error('Upload error:', uploadError || uploadData);
            throw new Error(uploadData?.error || uploadError?.message || 'Upload failed');
          }

          console.log('Upload successful:', uploadData.path);
          imageUrls.push(uploadData.publicUrl);
        }
      }

      const finalReason = additionalReason.trim() 
        ? `${basicReason}\n${additionalReason.trim()}`
        : basicReason;

      // Use RPC function to insert merit with proper session handling
      const { data: meritId, error } = await supabase.rpc('insert_merit', {
        p_student_id: selectedStudent.student_id,
        p_teacher_id: user.id,
        p_category: selectedCategory,
        p_reason: finalReason,
        p_score: selectedScore,
        p_image_url: imageUrls,
      });

      if (error) {
        console.error('Merit insert error:', error);
        throw error;
      }

      toast.success(`${selectedStudent.name} 학생에게 상점 ${selectedScore}점이 부여되었습니다`);
      
      // Reset form
      setSelectedStudent(null);
      setSearchTerm("");
      setSelectedCategory("");
      setSelectedReasonIndex("");
      setBasicReason("");
      setAdditionalReason("");
      setSelectedScore(0);
      setImageFiles([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error.message || "상점 부여에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableReasons = meritCategories.find(c => c.category === selectedCategory)?.reasons || [];

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
        <Card className="bg-merit-blue/10 border-merit-blue">
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-semibold text-merit-blue">선택된 학생:</span>{" "}
              {selectedStudent.name} ({selectedStudent.grade}학년 {selectedStudent.class}반 {selectedStudent.number}번)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      <div className="space-y-2">
        <Label>상점 항목</Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="상점 항목 선택" />
          </SelectTrigger>
          <SelectContent>
            {meritCategories.map((cat) => {
              const scores = cat.reasons.map(r => r.score);
              const minScore = Math.min(...scores);
              const maxScore = Math.max(...scores);
              const scoreRange = minScore === maxScore ? `${minScore}점` : `${minScore}-${maxScore}점`;
              
              return (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category} ({scoreRange})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Reason Selection */}
      {selectedCategory && (
        <>
          <div className="space-y-2">
            <Label>상점 기본 사유</Label>
            <Select value={selectedReasonIndex} onValueChange={handleReasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="상점 사유 선택" />
              </SelectTrigger>
              <SelectContent>
                {availableReasons.map((reason, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {reason.reason} ({reason.score}점)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReasonIndex && (
            <div className="space-y-2">
              <Label>구체적인 사유 (선택사항)</Label>
              <Textarea
                placeholder="기본 사유에 추가할 구체적인 내용을 입력하세요..."
                value={additionalReason}
                onChange={(e) => setAdditionalReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </>
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
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreviews.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`증빙 사진 ${index + 1}`}
                        className="w-full h-auto object-contain rounded border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Score Display */}
      {selectedScore > 0 && (
        <Card className="bg-merit-blue/5 border-merit-blue">
          <CardContent className="pt-4">
            <p className="text-center">
              <span className="text-2xl font-bold text-merit-blue">{selectedScore}점</span>
              <span className="text-sm text-muted-foreground ml-2">부여됩니다</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Button 
        type="submit" 
        className="w-full bg-merit-blue hover:bg-merit-blue/90"
        disabled={!selectedStudent || !selectedCategory || !basicReason || isSubmitting || imageLoading}
      >
        {isSubmitting ? "부여 중..." : imageLoading ? "사진 로딩 중..." : "상점 부여"}
      </Button>
      {imagePreviews.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {imagePreviews.length}개의 사진이 선택됨
        </p>
      )}
    </form>
  );
};

export default MeritForm;
