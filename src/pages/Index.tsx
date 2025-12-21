import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeacherLogin from "@/components/auth/TeacherLogin";
import StudentLogin from "@/components/auth/StudentLogin";
import SystemAdminLogin from "@/components/auth/SystemAdminLogin";
import { School } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [showSystemAdminDialog, setShowSystemAdminDialog] = useState(false);
  const [schoolSymbolUrl, setSchoolSymbolUrl] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 학교 심볼 URL 로드
  useEffect(() => {
    const loadSchoolSymbol = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'school_symbol_url')
          .maybeSingle();
        
        if (data?.setting_value) {
          setSchoolSymbolUrl(data.setting_value);
        }
      } catch (error) {
        console.error('Failed to load school symbol:', error);
      }
    };
    loadSchoolSymbol();
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
          <div className="p-4 sm:p-8">
            <div className="text-center mb-4 sm:mb-8">
              <div className="flex justify-center mb-3 sm:mb-6">
                {schoolSymbolUrl ? (
                  <img 
                    src={schoolSymbolUrl} 
                    alt="학교 심볼" 
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-600 via-orange-500 to-green-600 flex items-center justify-center">
                    <School className="w-8 h-8 sm:w-12 sm:h-12 text-white" strokeWidth={2} />
                  </div>
                )}
              </div>
              <h1 className="text-[1.75rem] sm:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent">
                스쿨라이프.KR
              </h1>
              <p className="text-lg sm:text-2xl font-semibold">
                <span className="bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent">
                  SchoolLife.
                </span>
                <span 
                  onClick={() => setShowSystemAdminDialog(true)}
                  className="bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent cursor-pointer hover:opacity-70 transition-opacity underline decoration-2"
                  title="시스템 관리자 로그인"
                >
                  KR
                </span>
              </p>
            </div>

            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                <TabsTrigger 
                  value="student"
                  className="data-[state=active]:bg-student data-[state=active]:text-white"
                >
                  학생
                </TabsTrigger>
                <TabsTrigger 
                  value="teacher"
                  className="data-[state=active]:bg-teacher data-[state=active]:text-white"
                >
                  교사
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <StudentLogin />
              </TabsContent>

              <TabsContent value="teacher">
                <TeacherLogin />
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>

      {/* System Admin Login Dialog */}
      <Dialog open={showSystemAdminDialog} onOpenChange={setShowSystemAdminDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              시스템 관리자 로그인
            </DialogTitle>
          </DialogHeader>
          <SystemAdminLogin onSuccess={() => setShowSystemAdminDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
