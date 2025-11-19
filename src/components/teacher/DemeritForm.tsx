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

interface DemeritCategory {
  category: string;
  reasons: { reason: string; score: number }[];
}

const demeritCategories: DemeritCategory[] = [
  {
    category: "준법",
    reasons: [
      { reason: "무단 지각·무단 결과·무단 조퇴", score: 3 },
      { reason: "무단 결석(1회)", score: 5 },
      { reason: "학교 지시 불이행", score: 3 },
      { reason: "교내 행사 무단 불참", score: 3 },
      { reason: "교외 단체 활동 또는 교외 행사 무단 불참", score: 3 },
      { reason: "청소 활동에 지속적으로 불성실하게 참여", score: 2 },
      { reason: "월담(출입문을 사용하지 않고 담 등을 넘어 출입)", score: 3 },
      { reason: "학교 허락 없이 티켓 제작·판매·알선 및 행사 참석", score: 3 },
      { reason: "출입 금지 장소 출입", score: 5 },
      { reason: "수업시간 전자기기(mp3, 휴대폰 등) 무단 사용", score: 3 },
      { reason: "사행성 오락(카드, 화투, 동전치기 등)", score: 2 },
      { reason: "음란물 반입·탐독·시청", score: 3 },
      { reason: "자동차·오토바이를 타고 등교하거나 폭주", score: 7 },
    ]
  },
  {
    category: "흡연 및 음주",
    reasons: [
      { reason: "교내에서 술·담배 소지", score: 3 },
      { reason: "교내·외 단체 활동 시 술·담배 반입", score: 3 },
      { reason: "교내·외에서 음주 또는 흡연", score: 5 },
    ]
  },
  {
    category: "예절 및 공중도덕",
    reasons: [
      { reason: "교내에서 쓰레기를 함부로 버림", score: 2 },
      { reason: "실내에서 실외화, 실외에서 실내화 착용", score: 2 },
      { reason: "교내에서 단순한 다툼이나 싸움", score: 7 },
      { reason: "급우 또는 선후배에게 심한 욕설", score: 3 },
      { reason: "교사 또는 어른에게 불손한 언행", score: 10 },
      { reason: "교내에서 비품·공공기물 훼손 또는 파손", score: 5 },
    ]
  },
  {
    category: "두발 및 용의복장",
    reasons: [
      { reason: "두발 또는 용의규정 위반 및 명찰착용 불이행", score: 2 },
      { reason: "기타 복장 규정 위반", score: 2 },
    ]
  },
  {
    category: "학습활동 및 기타",
    reasons: [
      { reason: "수업시간 중 음식물 섭취(껌, 과자 등)", score: 1 },
      { reason: "수업 중 면학 분위기를 저해함(잡담, 장난 등)", score: 3 },
      { reason: "학생 본분에 어긋나는 위반사항", score: 1 },
      { reason: "학생 본분에 어긋나는 위반사항", score: 2 },
      { reason: "학생 본분에 어긋나는 위반사항", score: 3 },
      { reason: "학생 본분에 어긋나는 위반사항", score: 5 },
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

const DemeritForm = () => {
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
    const categoryData = demeritCategories.find(c => c.category === selectedCategory);
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
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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

      let imageUrls: string[] = [];

      // Upload images if exist
      if (imageFiles.length > 0) {
        console.log('Starting upload for', imageFiles.length, 'files');
        for (const imageFile of imageFiles) {
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;

          console.log('Uploading file:', filePath, 'Size:', imageFile.size, 'Type:', imageFile.type);
          const { error: uploadError } = await supabase.storage
            .from('evidence-photos')
            .upload(filePath, imageFile);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }
          console.log('Upload successful:', filePath);

          const { data: { publicUrl } } = supabase.storage
            .from('evidence-photos')
            .getPublicUrl(filePath);

          imageUrls.push(publicUrl);

          // 파일 메타데이터 저장
          await supabase.from('file_metadata').insert({
            storage_path: filePath,
            original_filename: imageFile.name,
            file_size: imageFile.size,
            mime_type: imageFile.type,
            bucket_name: 'evidence-photos',
            uploaded_by: user.id
          });
        }
      }

      const finalReason = additionalReason.trim() 
        ? `${basicReason}\n${additionalReason.trim()}`
        : basicReason;

      // Use RPC function to insert demerit with proper session handling
      const { data: demeritId, error } = await supabase.rpc('insert_demerit', {
        p_student_id: selectedStudent.student_id,
        p_teacher_id: user.id,
        p_category: selectedCategory,
        p_reason: finalReason,
        p_score: selectedScore,
        p_image_url: imageUrls,
      });

      if (error) {
        console.error('Demerit insert error:', error);
        throw error;
      }

      toast.success(`${selectedStudent.name} 학생에게 벌점 ${selectedScore}점이 부여되었습니다`);
      
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
      toast.error(error.message || "벌점 부여에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableReasons = demeritCategories.find(c => c.category === selectedCategory)?.reasons || [];

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
        <Card className="bg-demerit-orange/10 border-demerit-orange">
          <CardContent className="pt-4">
            <p className="text-sm">
              <span className="font-semibold text-demerit-orange">선택된 학생:</span>{" "}
              {selectedStudent.name} ({selectedStudent.grade}학년 {selectedStudent.class}반 {selectedStudent.number}번)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      <div className="space-y-2">
        <Label>벌점 항목</Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger>
            <SelectValue placeholder="벌점 항목 선택" />
          </SelectTrigger>
          <SelectContent>
            {demeritCategories.map((cat) => {
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
            <Label>벌점 사유 (기본)</Label>
            <Select value={selectedReasonIndex} onValueChange={handleReasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="벌점 사유 선택" />
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
        <Card className="bg-demerit-orange/5 border-demerit-orange">
          <CardContent className="pt-4">
            <p className="text-center">
              <span className="text-2xl font-bold text-demerit-orange">{selectedScore}점</span>
              <span className="text-sm text-muted-foreground ml-2">부여됩니다</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Button 
        type="submit" 
        className="w-full bg-demerit-orange hover:bg-demerit-orange/90"
        disabled={!selectedStudent || !selectedCategory || !basicReason || isSubmitting}
      >
        {isSubmitting ? "부여 중..." : "벌점 부여"}
      </Button>
      {imagePreviews.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {imagePreviews.length}개의 사진이 선택됨
        </p>
      )}
    </form>
  );
};

export default DemeritForm;
