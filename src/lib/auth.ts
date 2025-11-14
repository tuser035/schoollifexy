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
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("학생을 찾을 수 없습니다");

    // Verify password using pgcrypto
    const { data: authData, error: authError } = await supabase.rpc("verify_student_password", {
      student_id_input: studentId,
      password_input: password,
    });

    if (authError) throw authError;
    if (!authData) throw new Error("비밀번호가 일치하지 않습니다");

    // Set session
    await supabase.rpc("set_student_session", { student_id_input: studentId });

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
    
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("call_t", normalizedPhone)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("교사를 찾을 수 없습니다");

    // Verify password using pgcrypto
    const { data: authData, error: authError } = await supabase.rpc("verify_teacher_password", {
      phone_input: normalizedPhone,
      password_input: password,
    });

    if (authError) throw authError;
    if (!authData) throw new Error("비밀번호가 일치하지 않습니다");

    // Set session
    await supabase.rpc("set_teacher_session", { teacher_id_input: data.id });

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
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("관리자를 찾을 수 없습니다");

    // Verify password using pgcrypto
    const { data: authData, error: authError } = await supabase.rpc("verify_admin_password", {
      email_input: email,
      password_input: password,
    });

    if (authError) throw authError;
    if (!authData) throw new Error("비밀번호가 일치하지 않습니다");

    // Set session
    await supabase.rpc("set_admin_session", { admin_id_input: data.id });

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
