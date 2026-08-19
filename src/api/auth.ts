import { apiRequest } from "./client";

export type VerifyOtpResponse = {
  success: boolean;
  token: string;
  user: { id: string; email: string };
};

export function requestOtp(email: string) {
  return apiRequest<{ success: boolean; isNewUser: boolean }>("/auth/request-otp", {
    method: "POST",
    body: { email },
  });
}

export function verifyOtp(email: string, otp: string) {
  return apiRequest<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: { email, otp },
  });
}
