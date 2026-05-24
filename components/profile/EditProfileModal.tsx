"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { authService } from "@/services/auth.service";
import { User } from "@/types/auth";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const MAX_BIO_LENGTH = 100;

export default function EditProfileModal({ isOpen, onClose, user }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form each time the modal opens or user data changes
  useEffect(() => {
    if (isOpen) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setBio(user.bio || "");
      setAvatarPreview(user.avatar || null);
      setAvatarFile(null);
    }
  }, [isOpen, user]);

  const initial = user.firstName?.charAt(0).toUpperCase() || "?";
  const displayAvatar = avatarPreview || user.avatar;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maximum image size is 5MB.");
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
      formData.append("bio", bio.trim());
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const response = await authService.updateProfile(formData);

      if (response.data.accessToken) {
        localStorage.setItem("accessToken", response.data.accessToken);
        window.dispatchEvent(new Event("auth-updated"));
      }

      toast.success("Profile updated successfully!");
      onClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset all changes
    setFirstName(user.firstName || "");
    setLastName(user.lastName || "");
    setBio(user.bio || "");
    setAvatarPreview(user.avatar || null);
    setAvatarFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#1a1a2e] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Edit Profile</h2>
          <button
            onClick={handleCancel}
            className="cursor-pointer p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative group cursor-pointer w-24 h-24 rounded-full overflow-hidden bg-gray-700 border-2 border-dashed border-gray-500 hover:border-violet-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7 text-white"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                </svg>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
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

          {/* Fields */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-400">Email</label>
              <input
                type="email"
                value={user.email || ""}
                disabled
                className="bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed focus:outline-none w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-white w-full"
                  placeholder="Enter your first name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-white w-full"
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Bio</label>
              <div className="relative">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl px-4 pt-3 pb-7 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all text-white w-full resize-none h-24"
                  placeholder="Write a short bio about yourself..."
                  maxLength={MAX_BIO_LENGTH}
                />
                <span className={`absolute bottom-3 right-3 text-xs ${bio.length >= MAX_BIO_LENGTH ? "text-red-400" : "text-gray-500"}`}>
                  {bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer px-5 py-2.5 rounded-xl font-medium text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`cursor-pointer px-5 py-2.5 rounded-xl font-semibold text-white transition-all active:scale-95 shadow-lg ${isSaving
                  ? "bg-violet-600/50 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20"
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
