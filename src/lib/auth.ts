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

    // Fetch student data after successful login
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("학생 정보를 가져올 수 없습니다");

    return {
      id: data.id,
      type: "student" as UserType,
      name: data.name,
      studentId: data.student_id,
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

    // Fetch teacher data after successful login
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", teacherId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("교사 정보를 가져올 수 없습니다");

    return {
      id: data.id,
      type: "teacher" as UserType,
      name: data.name,
      email: data.teacher_email,
      isHomeroom: data.is_homeroom,
      grade: data.grade,
      class: data.class,
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

    // Fetch admin data after successful login
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("id", adminId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("관리자 정보를 가져올 수 없습니다");

    return {
      id: data.id,
      type: "admin" as UserType,
      email: data.email,
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
