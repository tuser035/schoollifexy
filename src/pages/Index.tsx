import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeacherLogin from "@/components/auth/TeacherLogin";
import StudentLogin from "@/components/auth/StudentLogin";
import AdminLogin from "@/components/auth/AdminLogin";
import heroImage from "@/assets/nature-hero.jpg";

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                학교생활 포인트 관리
              </h1>
              <p className="text-muted-foreground">
                School Point Management System
              </p>
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
