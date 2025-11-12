import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

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
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedScore, setSelectedScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    const categoryData = meritCategories.find(c => c.category === selectedCategory);
    if (categoryData) {
      const reason = categoryData.reasons[parseInt(reasonIndex)];
      setSelectedReason(reason.reason);
      setSelectedScore(reason.score);
    }
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

      const { error } = await supabase
        .from("merits")
        .insert({
          student_id: selectedStudent.student_id,
          teacher_id: user.id,
          category: selectedCategory,
          reason: selectedReason,
          score: selectedScore,
        });

      if (error) throw error;

      toast.success(`${selectedStudent.name} 학생에게 상점 ${selectedScore}점이 부여되었습니다`);
      
      // Reset form
      setSelectedStudent(null);
      setSearchTerm("");
      setSelectedCategory("");
      setSelectedReason("");
      setSelectedScore(0);
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
        <div className="space-y-2">
          <Label>상점 사유</Label>
          <Select value={selectedReason} onValueChange={handleReasonChange}>
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
        disabled={!selectedStudent || !selectedCategory || !selectedReason || isSubmitting}
      >
        {isSubmitting ? "부여 중..." : "상점 부여"}
      </Button>
    </form>
  );
};

export default MeritForm;
