"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByEmailAndPassword } from "../(home)/fetch";
import { getDemoUserEmailCookieName } from "@/lib/auth";

export async function signInWithCredentials(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = await findUserByEmailAndPassword(email, password);
  if (!user) {
    return { error: "Invalid email or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(getDemoUserEmailCookieName(), user.email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  redirect("/");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(getDemoUserEmailCookieName());
  redirect("/auth/sign-in");
}
