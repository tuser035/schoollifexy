import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Users } from "lucide-react";
import StudentGroupManager from "./StudentGroupManager";
import TeacherGroupManager from "./TeacherGroupManager";

const GroupTabs = () => {
  const [activeTab, setActiveTab] = useState("students");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger 
          value="students"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <GraduationCap className="w-4 h-4 mr-2" />
          학생 선택
        </TabsTrigger>
        <TabsTrigger 
          value="teachers"
          className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Users className="w-4 h-4 mr-2" />
          교사 선택
        </TabsTrigger>
      </TabsList>

      <TabsContent value="students" className="mt-0">
        <StudentGroupManager />
      </TabsContent>

      <TabsContent value="teachers" className="mt-0">
        <TeacherGroupManager />
      </TabsContent>
    </Tabs>
  );
};

export default GroupTabs;
