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
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedScore, setSelectedScore] = useState(0);
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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedReason("");
    setSelectedScore(0);
  };

  const handleReasonChange = (reasonIndex: string) => {
    const categoryData = demeritCategories.find(c => c.category === selectedCategory);
    if (categoryData) {
      const reason = categoryData.reasons[parseInt(reasonIndex)];
      setSelectedReason(reason.reason);
      setSelectedScore(reason.score);
    }
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
    
    if (!selectedStudent || !selectedCategory || !selectedReason) {
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

      const { error } = await supabase
        .from("demerits")
        .insert({
          student_id: selectedStudent.student_id,
          teacher_id: user.id,
          category: selectedCategory,
          reason: selectedReason,
          score: selectedScore,
          image_url: imageUrl,
        });

      if (error) throw error;

      toast.success(`${selectedStudent.name} 학생에게 벌점 ${selectedScore}점이 부여되었습니다`);
      
      // Reset form
      setSelectedStudent(null);
      setSearchTerm("");
      setSelectedCategory("");
      setSelectedReason("");
      setSelectedScore(0);
      handleRemoveImage();
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
            <Select value={selectedReason} onValueChange={handleReasonChange}>
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

          {selectedReason && (
            <div className="space-y-2">
              <Label>구체적인 사유 (선택사항)</Label>
              <Textarea
                placeholder="구체적인 사유를 입력하세요..."
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
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
        disabled={!selectedStudent || !selectedCategory || !selectedReason || isSubmitting}
      >
        {isSubmitting ? "부여 중..." : "벌점 부여"}
      </Button>
    </form>
  );
};

export default DemeritForm;
