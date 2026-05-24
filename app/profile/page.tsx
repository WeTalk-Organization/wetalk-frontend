"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/common/Header";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "react-hot-toast";
import Image from "next/image";
import { followService, UserStats } from "@/services/follow.service";
import FollowListModal from "@/components/profile/FollowListModal";
import EditProfileModal from "@/components/profile/EditProfileModal";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  const [stats, setStats] = useState<UserStats>({ followerCount: 0, followingCount: 0 });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followModalType, setFollowModalType] = useState<"followers" | "following">("followers");

  useEffect(() => {
    if (user) {
      followService.getStats(user.id).then((res) => {
        if (res.data) setStats(res.data);
      }).catch(err => console.error("Failed to fetch stats", err));
    }
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-white">Not logged in</div>;
  }

  const initial = user.firstName?.charAt(0).toUpperCase() || "?";

  const openFollowModal = (type: "followers" | "following") => {
    setFollowModalType(type);
    setFollowModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <Toaster position="bottom-left" />
      <Header />

      <div className="max-w-3xl mx-auto mt-10 p-4 sm:p-6">
        <div className="relative bg-[#151525] rounded-3xl border border-white/10 shadow-xl p-6 sm:p-8">

          {/* Edit Button (Top Right) */}
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="cursor-pointer group absolute top-4 right-4 sm:top-6 sm:right-6 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
            </svg>
            {/* Tooltip */}
            <span className="absolute -top-10 right-0 bg-gray-800 text-xs text-white px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
              Edit Profile
            </span>
          </button>

          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row sm:items-center mb-6 gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-[#151525] bg-gray-700 shadow-xl flex-shrink-0 relative mx-auto sm:mx-0">
              {user.avatar ? (
                <Image src={user.avatar} alt="User Avatar" fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400 font-bold">
                  {initial}
                </div>
              )}
            </div>

            {/* Name & Follow Stats */}
            <div className="flex flex-col items-center sm:items-start">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 text-center sm:text-left">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-gray-400 text-sm mb-4">{user.email}</p>
              
              {user.bio && (
                <p className="text-gray-300 text-sm mb-5 max-w-md text-center sm:text-left break-words whitespace-pre-wrap">
                  {user.bio}
                </p>
              )}

              <div className="flex gap-4 items-center">
                <div
                  className="flex flex-row items-center gap-1.5 cursor-pointer group"
                  onClick={() => openFollowModal("following")}
                >
                  <span className="text-base font-bold text-white group-hover:text-violet-400 transition-colors">
                    {stats.followingCount}
                  </span>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 font-medium">Following</span>
                </div>
                <div className="w-px h-4 bg-white/10"></div>

                <div
                  className="flex flex-row items-center gap-1.5 cursor-pointer group"
                  onClick={() => openFollowModal("followers")}
                >
                  <span className="text-base font-bold text-white group-hover:text-violet-400 transition-colors">
                    {stats.followerCount}
                  </span>
                  <span className="text-sm text-gray-400 group-hover:text-gray-300 font-medium">Followers</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
      />

      <FollowListModal
        isOpen={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        userId={user.id}
        type={followModalType}
        onUnfollow={() =>
          setStats((prev) => ({ ...prev, followingCount: Math.max(0, prev.followingCount - 1) }))
        }
      />
    </div>
  );
}
