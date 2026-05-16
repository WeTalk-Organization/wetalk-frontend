"use client";
import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/common/Header";
import { useAuth } from "@/hooks/useAuth";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setAvatarPreview(user.avatar || null);
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-white">Loading...</div>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith("image/")) {
        toast.error("Vui lòng chọn file hình ảnh hợp lệ.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh tối đa là 5MB.");
        return;
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (trimmedFirstName.length < 2 || trimmedFirstName.length > 30) {
      toast.error("First name must be between 2 and 30 characters.");
      return;
    }
    if (trimmedLastName.length < 2 || trimmedLastName.length > 30) {
      toast.error("Last name must be between 2 and 30 characters.");
      return;
    }

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append("firstName", trimmedFirstName);
      formData.append("lastName", trimmedLastName);
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await authService.updateProfile(formData);

      // Update token in localStorage
      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
        window.dispatchEvent(new Event("auth-updated"));
      }

      toast.success("Profile updated successfully!");

    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const initial = user?.firstName?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Toaster position="bottom-left" />
      <Header />
      <div className="max-w-2xl mx-auto mt-10 p-6 bg-white/5 rounded-2xl border border-white/10 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-violet-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
          Edit Profile
        </h1>
        <form onSubmit={handleSave} className="space-y-8">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-8">
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative group cursor-pointer w-28 h-28 rounded-full overflow-hidden bg-gray-700 border-2 border-dashed border-gray-500 hover:border-violet-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-semibold">
                    {initial}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Change Avatar
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-white/5 border border-transparent rounded-lg px-4 py-2.5 text-gray-500 cursor-not-allowed focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  placeholder="Enter your first name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <button
              type="button"
              onClick={() => router.back()}
              className="cursor-pointer px-6 py-2 rounded-lg font-medium text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`cursor-pointer px-6 py-2 rounded-lg font-semibold text-white transition-all active:scale-95 ${isSaving ? "bg-violet-600/50 cursor-not-allowed" : "bg-violet-600 hover:bg-violet-500"
                }`}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
