import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TeacherLogin from "@/components/auth/TeacherLogin";
import StudentLogin from "@/components/auth/StudentLogin";
import SystemAdminLogin from "@/components/auth/SystemAdminLogin";
import { School, MessageCircle } from "lucide-react";
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
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [schoolNameEn, setSchoolNameEn] = useState<string | null>(null);
  const [kakaoChatUrl, setKakaoChatUrl] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % backgroundImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 학교 심볼 URL 및 학교명 로드
  useEffect(() => {
    const loadSchoolSettings = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['school_symbol_url', 'school_name', 'school_name_en', 'kakao_chat_url']);
        
        if (data) {
          const symbolSetting = data.find(s => s.setting_key === 'school_symbol_url');
          const nameSetting = data.find(s => s.setting_key === 'school_name');
          const nameEnSetting = data.find(s => s.setting_key === 'school_name_en');
          const kakaoChatSetting = data.find(s => s.setting_key === 'kakao_chat_url');
          if (symbolSetting?.setting_value) {
            setSchoolSymbolUrl(symbolSetting.setting_value);
          }
          if (nameSetting?.setting_value) {
            setSchoolName(nameSetting.setting_value);
          }
          if (nameEnSetting?.setting_value) {
            setSchoolNameEn(nameEnSetting.setting_value);
          }
          if (kakaoChatSetting?.setting_value) {
            setKakaoChatUrl(kakaoChatSetting.setting_value);
          }
        }
      } catch (error) {
        console.error('Failed to load school settings:', error);
      }
    };
    loadSchoolSettings();
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
          <div className="p-4 sm:p-8 pb-3 sm:pb-5">
            <div className="text-center mb-4 sm:mb-8">
              <div className="flex justify-center mb-3 sm:mb-6">
                {schoolSymbolUrl ? (
                  <img 
                    src={schoolSymbolUrl} 
                    alt="학교 심볼" 
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full object-cover shadow-lg hover:scale-110 transition-transform duration-300 hover:shadow-xl"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-600 via-orange-500 to-green-600 flex items-center justify-center hover:scale-110 transition-transform duration-300 hover:shadow-xl">
                    <School className="w-8 h-8 sm:w-12 sm:h-12 text-white" strokeWidth={2} />
                  </div>
                )}
              </div>
              <h1 className="text-[1.5rem] sm:text-3xl font-bold mb-1 bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent">
                {schoolName || "스쿨라이프.KR"}
              </h1>
              <p className="text-base sm:text-xl font-semibold">
                {schoolNameEn ? (
                  <>
                    <span className="bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent">
                      {schoolNameEn.replace(/\s*\.\s*$/, "")}.
                    </span>
                    <span 
                      onClick={() => setShowSystemAdminDialog(true)}
                      className="bg-gradient-to-r from-blue-600 via-orange-500 to-green-600 bg-clip-text text-transparent cursor-pointer hover:opacity-70 transition-opacity underline decoration-2"
                      title="시스템 관리자 로그인"
                    >
                      KR
                    </span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </p>
            </div>

            <Tabs defaultValue="student" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                <TabsTrigger 
                  value="student"
                  className="transition-all duration-300 ease-in-out data-[state=active]:bg-student data-[state=active]:text-white"
                >
                  학생
                </TabsTrigger>
                <TabsTrigger 
                  value="teacher"
                  className="transition-all duration-300 ease-in-out data-[state=active]:bg-teacher data-[state=active]:text-white"
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

            {/* 카카오톡 오픈채팅방 안내 */}
            <p className="mt-2 text-xs sm:text-sm text-center text-muted-foreground whitespace-nowrap flex items-center justify-center gap-1">
              스쿨라이프.KR 시스템 문의가 있을까요?{" "}
              {kakaoChatUrl ? (
                <a 
                  href={kakaoChatUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-yellow-600 hover:underline"
                >
                  <MessageCircle className="w-4 h-4" />
                  오픈채팅방
                </a>
              ) : (
                <span className="text-muted-foreground">오픈채팅방</span>
              )}
            </p>

          </div>
        </Card>
      </div>

      {/* System Admin Login Dialog */}
      <Dialog open={showSystemAdminDialog} onOpenChange={setShowSystemAdminDialog}>
        <DialogContent className="max-w-[90%] sm:max-w-[360px] p-4 sm:p-5 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-lg sm:text-xl bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              시스템 관리자 로그인
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm [&_label]:text-xs [&_input]:h-8 [&_input]:text-sm [&_button]:h-8 [&_button]:text-sm">
            <SystemAdminLogin onSuccess={() => setShowSystemAdminDialog(false)} />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Index;
