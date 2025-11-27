import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  student_id: string;
  name: string;
  grade: number;
  class: number;
  number: number;
}

interface StudentGroup {
  id: string;
  group_name: string;
  student_ids: string[];
  created_at: string;
}

const StudentGroupManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [searchGrade, setSearchGrade] = useState<string>("");
  const [searchClass, setSearchClass] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const loadStudents = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_students", {
        admin_id_input: user.id,
        search_grade: searchGrade ? parseInt(searchGrade) : null,
        search_class: searchClass ? parseInt(searchClass) : null,
      });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error("Error loading students:", error);
      toast.error("학생 목록 조회 실패: " + error.message);
    }
  };

  const loadGroups = async () => {
    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);
      
      const { data, error } = await supabase.rpc("admin_get_student_groups", {
        admin_id_input: user.id,
      });

      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      console.error("Error loading groups:", error);
      toast.error("그룹 목록 조회 실패: " + error.message);
    }
  };

  useEffect(() => {
    loadStudents();
    loadGroups();
  }, [searchGrade, searchClass]);

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.student_id));
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      toast.error("그룹 이름을 입력하세요");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("학생을 선택하세요");
      return;
    }

    try {
      setIsLoading(true);
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase.rpc("admin_insert_student_group", {
        admin_id_input: user.id,
        group_name_input: groupName,
        student_ids_input: selectedStudents,
      });

      if (error) throw error;

      toast.success(`그룹 "${groupName}" 저장 완료 (${selectedStudents.length}명)`);
      setGroupName("");
      setSelectedStudents([]);
      loadGroups();
    } catch (error: any) {
      console.error("Error saving group:", error);
      toast.error("그룹 저장 실패: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`"${groupName}" 그룹을 삭제하시겠습니까?`)) return;

    try {
      const authUser = localStorage.getItem("auth_user");
      if (!authUser) return;

      const user = JSON.parse(authUser);

      const { error } = await supabase
        .from("student_groups")
        .delete()
        .eq("id", groupId)
        .eq("admin_id", user.id);

      if (error) throw error;

      toast.success(`그룹 "${groupName}" 삭제 완료`);
      loadGroups();
    } catch (error: any) {
      console.error("Error deleting group:", error);
      toast.error("그룹 삭제 실패: " + error.message);
    }
  };

  const handleLoadGroup = (group: StudentGroup) => {
    setSelectedStudents(group.student_ids);
    setGroupName(group.group_name);
    toast.success(`그룹 "${group.group_name}" 불러오기 완료`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            학생 선택
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label className="text-sm">학년</Label>
              <Select value={searchGrade} onValueChange={setSearchGrade}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  <SelectItem value="1">1학년</SelectItem>
                  <SelectItem value="2">2학년</SelectItem>
                  <SelectItem value="3">3학년</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">반</Label>
              <Select value={searchClass} onValueChange={setSearchClass}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">전체</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}반
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedStudents.length === students.length ? "전체 해제" : "전체 선택"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedStudents.length}명 선택됨
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 space-y-2">
            {students.map(student => (
              <div
                key={student.student_id}
                className="flex items-center space-x-2 p-2 hover:bg-accent rounded"
              >
                <Checkbox
                  checked={selectedStudents.includes(student.student_id)}
                  onCheckedChange={() => handleStudentToggle(student.student_id)}
                />
                <span className="flex-1">
                  {student.grade}-{student.class}-{student.number} {student.name}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">그룹 이름</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="예: 1학년 전체, 축구부 등"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-sm"
              />
              <Button 
                onClick={handleSaveGroup} 
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">저장된 그룹 ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                저장된 그룹이 없습니다
              </p>
            ) : (
              groups.map(group => (
                <div
                  key={group.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-accent gap-2"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">{group.group_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {group.student_ids.length}명 • {new Date(group.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadGroup(group)}
                      className="flex-1 sm:flex-none"
                    >
                      불러오기
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id, group.group_name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentGroupManager;
