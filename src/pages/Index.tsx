import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import TeacherLogin from "@/components/auth/TeacherLogin";
import StudentLogin from "@/components/auth/StudentLogin";
import AdminLogin from "@/components/auth/AdminLogin";
import { School, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

const backgroundImages = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4", // 산 풍경
  "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d", // 초원
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b", // 산악 호수
  "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5", // 숲
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946", // 작약꽃
  "https://images.unsplash.com/photo-1595815771614-ade9d652a65d", // 연꽃
  "https://images.unsplash.com/photo-1604762524889-d0c50a279a20", // 국화
  "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11", // 흰 들꽃
];

const Index = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000); // 5초마다 이미지 변경

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background with rotating images */}
      <div className="absolute inset-0">
        {backgroundImages.map((image, index) => (
          <div
            key={index}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${image})`,
              opacity: currentImageIndex === index ? 1 : 0,
            }}
          />
        ))}
        <div className="absolute inset-0 animate-sunrise-sunset" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 via-orange-500 to-green-600 flex items-center justify-center">
                  <School className="w-12 h-12 text-white" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent">
                스쿨라이프.KR
              </h1>
              <p className="text-2xl font-semibold bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent">
                SchoolLife.KR
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/manual")}
                className="mt-4"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                사용자 매뉴얼
              </Button>
            </div>

            <Tabs defaultValue="teacher" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger 
                  value="teacher"
                  className="data-[state=active]:bg-teacher data-[state=active]:text-white"
                >
                  교사
                </TabsTrigger>
                <TabsTrigger 
                  value="student"
                  className="data-[state=active]:bg-student data-[state=active]:text-white"
                >
                  학생
                </TabsTrigger>
                <TabsTrigger 
                  value="admin"
                  className="data-[state=active]:bg-admin data-[state=active]:text-white"
                >
                  관리자
                </TabsTrigger>
              </TabsList>

              <TabsContent value="teacher">
                <TeacherLogin />
              </TabsContent>

              <TabsContent value="student">
                <StudentLogin />
              </TabsContent>

              <TabsContent value="admin">
                <AdminLogin />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
