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
    const { data, error } = await supabase.rpc("student_login", {
      student_id_input: studentId,
      password_input: password,
    });

    if (error) throw error;
    if (!data) throw new Error("로그인에 실패했습니다");

    const userData = data as any;
    return {
      id: userData.id,
      type: "student" as UserType,
      name: userData.name,
      studentId: userData.student_id,
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
    
    const { data, error } = await supabase.rpc("teacher_login", {
      phone_input: normalizedPhone,
      password_input: password,
    });

    if (error) throw error;
    if (!data) throw new Error("로그인에 실패했습니다");

    const userData = data as any;
    return {
      id: userData.id,
      type: "teacher" as UserType,
      name: userData.name,
      email: userData.email,
      isHomeroom: userData.is_homeroom,
      grade: userData.grade,
      class: userData.class,
    };
  } catch (error: any) {
    throw new Error(error.message || "로그인에 실패했습니다");
  }
};

// Admin login
export const loginAdmin = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.rpc("admin_login", {
      email_input: email,
      password_input: password,
    });

    if (error) throw error;
    if (!data) throw new Error("로그인에 실패했습니다");

    const userData = data as any;
    return {
      id: userData.id,
      type: "admin" as UserType,
      email: userData.email,
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
