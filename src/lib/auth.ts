import { supabase } from "@/integrations/supabase/client";

export type UserType = "student" | "teacher" | "admin";

export interface AuthUser {
  id: string;
  type: UserType;
  name?: string;
  studentId?: string;
  email?: string;
  isHomeroom?: boolean;
  grade?: number;
  class?: number;
}

// Student login
export const loginStudent = async (studentId: string, password: string) => {
  try {
    // Login using secure function (verifies password and sets session)
    const { data: loginSuccess, error: loginError } = await supabase.rpc("student_login", {
      student_id_input: studentId,
      password_input: password,
    });

    if (loginError) throw loginError;
    if (!loginSuccess) throw new Error("학번 또는 비밀번호가 일치하지 않습니다");

    // Explicitly set session again to ensure RLS works
    await supabase.rpc("set_student_session", { student_id_input: studentId });

    // Create student object without fetching from database
    return {
      id: studentId, // Use studentId as ID for now
      type: "student" as UserType,
      name: "학생", // Default name
      studentId: studentId,
    };
  } catch (error: any) {
    throw new Error(error.message || "로그인에 실패했습니다");
  }
};

// Teacher login
export const loginTeacher = async (phone: string, password: string) => {
  try {
    // Normalize phone number (remove all non-digits, then format as XXX-XXXX-XXXX)
    const digitsOnly = phone.replace(/\D/g, '');
    const normalizedPhone = digitsOnly.length === 11 
      ? `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`
      : phone;
    
    // Login using secure function (verifies password and sets session)
    const { data: teacherId, error: loginError } = await supabase.rpc("teacher_login", {
      phone_input: normalizedPhone,
      password_input: password,
    });

    if (loginError) throw loginError;
    if (!teacherId) throw new Error("전화번호 또는 비밀번호가 일치하지 않습니다");

    // Explicitly set session again to ensure RLS works
    await supabase.rpc("set_teacher_session", { teacher_id_input: teacherId });

    // Create teacher object without fetching from database
    return {
      id: teacherId,
      type: "teacher" as UserType,
      name: "교사", // Default name since we don't have access to actual name
      email: "",   // Will be set by dashboard
      isHomeroom: false,
      grade: null,
      class: null,
    };
  } catch (error: any) {
    throw new Error(error.message || "로그인에 실패했습니다");
  }
};

// Admin login
export const loginAdmin = async (email: string, password: string) => {
  try {
    // Login using secure function (verifies password and sets session)
    const { data: adminId, error: loginError } = await supabase.rpc("admin_login", {
      email_input: email,
      password_input: password,
    });

    if (loginError) throw loginError;
    if (!adminId) throw new Error("이메일 또는 비밀번호가 일치하지 않습니다");

    // Explicitly set session again to ensure RLS works
    await supabase.rpc("set_admin_session", { admin_id_input: adminId });

    // Create admin object without fetching from database
    return {
      id: adminId,
      type: "admin" as UserType,
      email: email,
    };
  } catch (error: any) {
    throw new Error(error.message || "로그인에 실패했습니다");
  }
};

// Logout
export const logout = () => {
  localStorage.removeItem("auth_user");
  window.location.href = "/";
};
