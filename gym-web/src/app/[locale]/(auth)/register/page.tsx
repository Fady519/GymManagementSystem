import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join Power Fitness: create your member account in under a minute.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
