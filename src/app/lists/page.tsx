"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { mockDb, CustomList, Creator } from "@/lib/mockDb";

export default function ListsPage() {
  const { blockedUsers, favoriteCreators, toggleBlock, toggleFavorite, showToast } = useUser();
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeTab, setActiveTab] = useState<"custom" | "favorites" | "blocked">("custom");
  const [newListName, setNewListName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // States to add user to a specific list
  const [addUserInputs, setAddUserInputs] = useState<Record<string, string>>({});

  const fetchLists = () => {
    setCustomLists(mockDb.getCustomLists());
  };

  useEffect(() => {
    setTimeout(() => {
      fetchLists();
    }, 0);

    const handleListsUpdate = () => fetchLists();
    window.addEventListener("ch_lists_updated", handleListsUpdate);
    return () => window.removeEventListener("ch_lists_updated", handleListsUpdate);
  }, []);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    mockDb.createCustomList(newListName.trim());
    setNewListName("");
    setShowAddForm(false);
    fetchLists();
    showToast("New list created!");
  };

  const handleDeleteList = (id: string) => {
    if (confirm("Are you sure you want to delete this list?")) {
      mockDb.deleteCustomList(id);
      fetchLists();
      showToast("List deleted");
    }
  };

  const handleAddUserToList = (listId: string) => {
    const username = addUserInputs[listId] || "";
    if (!username.trim()) return;

    const cleanUsername = username.replace("@", "").trim();
    
    // Check if creator exists or is a valid string
    mockDb.addUserToList(listId, cleanUsername);
    setAddUserInputs({ ...addUserInputs, [listId]: "" });
    fetchLists();
    showToast(`Added @${cleanUsername} to list`);
  };

  const handleRemoveUserFromList = (listId: string, username: string) => {
    mockDb.removeUserFromList(listId, username);
    fetchLists();
    showToast(`Removed @${username} from list`);
  };

  const handleUnblock = (username: string) => {
    toggleBlock(username);
    showToast(`Unblocked @${username}`);
  };

  const handleRemoveFavorite = (username: string) => {
    toggleFavorite(username);
    showToast(`Removed @${username} from favorites`);
  };

  return (
    <AppShell>
      {/* Mobile Top Header */}
      <MobileHeader>
        <span className="text-sm font-bold text-text-muted select-none">Lists</span>
      </MobileHeader>

      {/* Main Content Column */}
      <div className="app-page-shell space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="space-y-1 select-none">
          <h1 className="text-lg font-black text-text-main font-sans tracking-tight">Lists & Audience Groups</h1>
          <p className="text-xs text-text-muted font-medium">Create custom filters, track top support lists, and manage blocked accounts.</p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between border-b border-border pb-0 select-none bg-transparent">
          <div className="flex gap-6 overflow-x-auto no-scrollbar w-full">
            {(["custom", "favorites", "blocked"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[14px] font-extrabold pb-3.5 cursor-pointer transition-all border-b-2 leading-none relative capitalize ${
                  activeTab === tab
                    ? "border-primary text-primary font-black"
                    : "border-transparent text-text-muted hover:text-text-main"
                }`}
              >
                {tab === "custom" ? "Custom Lists" : tab === "favorites" ? "Favorites" : "Blocked"}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          
          {/* Custom Lists Tab */}
          {activeTab === "custom" && (
            <div className="space-y-4">
              
              {/* Creator Trigger Row */}
              <div className="flex justify-between items-center select-none pb-1">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">My Directories</p>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-black px-4 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1 active:scale-[0.97]"
                >
                  <span className="material-symbols-outlined text-[16px] leading-none">add</span>
                  <span>New List</span>
                </button>
              </div>

              {/* Add New List form panel */}
              {showAddForm && (
                <form onSubmit={handleCreateList} className="bg-surface border border-border p-4 rounded-2xl flex gap-3 animate-fade-in">
                  <input
                    type="text"
                    required
                    placeholder="Enter list name (e.g. VIP Tippers)"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="flex-grow px-4 py-2 bg-background border border-border focus:border-primary rounded-xl text-xs font-semibold outline-none text-text-main"
                  />
                  <button
                    type="submit"
                    className="bg-primary text-white text-xs font-black px-5 rounded-xl hover:opacity-95 cursor-pointer"
                  >
                    Create
                  </button>
                </form>
              )}

              {/* Lists Grid */}
              {customLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 select-none">
                  <span className="material-symbols-outlined text-[48px] text-text-muted">folder_open</span>
                  <p className="text-xs font-bold text-text-main">No custom lists yet</p>
                  <p className="text-[10px] text-text-muted max-w-[220px]">Build directories of fans or creators for target messaging or tracking.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customLists.map((list) => (
                    <div key={list.id} className="bg-surface border border-border rounded-2xl p-4.5 space-y-4 shadow-sm">
                      
                      {/* List Header */}
                      <div className="flex justify-between items-center select-none pb-2 border-b border-border/40">
                        <div>
                          <h3 className="text-xs font-black text-text-main uppercase tracking-wider">{list.name}</h3>
                          <p className="text-[9px] text-text-muted mt-0.5 font-bold">{list.usernames.length} members linked</p>
                        </div>
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          className="h-8 w-8 rounded-full border border-border text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete List"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>
                      </div>

                      {/* List Members */}
                      <div className="space-y-2">
                        {list.usernames.length === 0 ? (
                          <p className="text-[10px] text-text-muted italic py-1">No users added to this list yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {list.usernames.map((uname) => (
                              <div
                                key={uname}
                                className="bg-background border border-border pl-2.5 pr-1.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] font-bold text-text-main select-none animate-fade-in"
                              >
                                <span>@{uname}</span>
                                <button
                                  onClick={() => handleRemoveUserFromList(list.id, uname)}
                                  className="material-symbols-outlined text-[14px] text-text-muted hover:text-red-500 cursor-pointer"
                                >
                                  close
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Member inline form */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add user by username..."
                          value={addUserInputs[list.id] || ""}
                          onChange={(e) => setAddUserInputs({ ...addUserInputs, [list.id]: e.target.value })}
                          className="flex-grow px-3 py-1.5 bg-background border border-border focus:border-primary rounded-lg text-[10px] font-bold outline-none text-text-main"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddUserToList(list.id);
                          }}
                        />
                        <button
                          onClick={() => handleAddUserToList(list.id)}
                          className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                        >
                          Add User
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            favoriteCreators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 select-none">
                <span className="material-symbols-outlined text-[48px] text-text-muted">star</span>
                <p className="text-xs font-bold text-text-main">No favorites added</p>
                <p className="text-[10px] text-text-muted max-w-[220px]">Visit creator pages and click the star/heart button to save them to your favorites list.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {favoriteCreators.map((username) => {
                  const creatorObj = mockDb.getCreator(username);
                  return (
                    <div
                      key={username}
                      className="bg-surface border border-border p-3.5 rounded-2xl flex justify-between items-center gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 select-none">
                        <img
                          src={creatorObj?.avatar || "/assets/be708ecefc41b969ee64c477f954168c.png"}
                          alt={username}
                          className="h-10 w-10 rounded-full object-cover border border-border"
                        />
                        <div className="min-w-0">
                          <Link href={`/profile?u=${username}`} className="text-xs font-black text-text-main hover:text-primary transition-colors truncate">
                            {creatorObj?.name || username}
                          </Link>
                          <p className="text-[9px] text-text-muted font-bold">@{username}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFavorite(username)}
                        className="h-8 w-8 rounded-full border border-border text-accent flex items-center justify-center hover:bg-accent/5 cursor-pointer transition-colors"
                        title="Remove Favorite"
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Blocked Tab */}
          {activeTab === "blocked" && (
            blockedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 select-none">
                <span className="material-symbols-outlined text-[48px] text-text-muted">shield</span>
                <p className="text-xs font-bold text-text-main">Clean block list</p>
                <p className="text-[10px] text-text-muted max-w-[220px]">Restrict users or creators to prevent notifications, messages, and feed subscriptions.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((username) => {
                  const creatorObj = mockDb.getCreator(username);
                  return (
                    <div
                      key={username}
                      className="bg-surface border border-border p-3.5 rounded-2xl flex justify-between items-center gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0 select-none">
                        <img
                          src={creatorObj?.avatar || "/assets/be708ecefc41b969ee64c477f954168c.png"}
                          alt={username}
                          className="h-10 w-10 rounded-full object-cover border border-border grayscale"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-text-main truncate">{creatorObj?.name || username}</p>
                          <p className="text-[9px] text-text-muted font-bold">@{username}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnblock(username)}
                        className="px-4 py-1.5 border border-red-500 text-red-500 rounded-full hover:bg-red-500/10 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Unblock
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      </div>
    </AppShell>
  );
}
