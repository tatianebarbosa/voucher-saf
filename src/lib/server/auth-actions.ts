"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  const email = formData.get("email");
  const password = formData.get("password");
  const callbackUrl =
    formData.get("callbackUrl")?.toString() || "/painel-saf";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Credenciais invalidas. Verifique o e-mail e a senha informados.";
        default:
          return "Não foi possível autenticar. Tente novamente.";
      }
    }

    throw error;
  }
}

export async function logout(formData: FormData) {
  const redirectTo = formData.get("redirectTo")?.toString() || "/login";

  await signOut({ redirectTo });
}
