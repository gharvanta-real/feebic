"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useUser } from "@/context/UserContext";
import { apiClient } from "@/lib/apiClient";

type CreatorSummary = {
  name: string;
  username: string;
  avatar: string;
};

export default function ListsPage() {
  const { blockedUsers, favoriteCreators, toggleBlock, toggleFavorite, showToast } = useUser();
  const [activeTab, setActiveTab] = useState<"custom" | "favorites" | "blocked">("custom");
  const [newListName, setNewListName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [creatorDirectory, setCreatorDirectory] = useState<Record<string, CreatorSummary>>({});
  const [lists, setLists] = useState<any[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [memberUsernameToAdd, setMemberUsernameToAdd] = useState<Record<string, string>>({});

  useEffect(() => {
    apiClient.get<any[]>("/users/creators")
      .then((creators) => {
        const next: Record<string, CreatorSummary> = {};
        creators.forEach((creator) => {
          next[creator.username] = {
            name: creator.display_name || creator.name || creator.username,
            username: creator.username,
            avatar: creator.avatar || "/assets/be708ecefc41b969ee64c477f954168c.png",
          };
        });
        setCreatorDirectory(next);
      })
      .catch(() => {});

    apiClient.get<any[]>("/lists")
      .then((data) => {
        setLists(data);
        setLoadingLists(false);
      })
      .catch((err) => {
        setLoadingLists(false);
        showToast(err instanceof Error ? err.message : "Failed to load custom lists");
      });
  }, []);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const newList = await apiClient.post<any>("/lists", { name: newListName.trim() });
      setLists([newList, ...lists]);
      setNewListName("");
      setShowAddForm(false);
      showToast(`Created custom list "${newList.name}"`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create list");
    }
  };

  const handleDeleteList = async (id: string) => {
    try {
      await apiClient.delete(`/lists/${id}`);
      setLists(lists.filter(l => l.id !== id));
      if (editingListId === id) setEditingListId(null);
      showToast("List deleted successfully");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete list");
    }
  };

  const handleAddMember = async (listId: string) => {
    const username = memberUsernameToAdd[listId];
    if (!username) return;

    try {
      await apiClient.post(`/lists/${listId}/members`, { username });
      setLists(lists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            usernames: [...list.usernames, username]
          };
        }
        return list;
      }));
      setMemberUsernameToAdd({ ...memberUsernameToAdd, [listId]: "" });
      showToast(`Added @${username} to list`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const handleRemoveMember = async (listId: string, username: string) => {
    try {
      await apiClient.delete(`/lists/${listId}/members/${username}`);
      setLists(lists.map(list => {
        if (list.id === listId) {
          return {
            ...list,
            usernames: list.usernames.filter((u: string) => u !== username)
          };
        }
        return list;
      }));
      showToast(`Removed @${username} from list`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const handleUnblock = async (username: string) => {
    await toggleBlock(username);
    showToast(`Unblocked @${username}`);
  };

  const handleRemoveFavorite = async (username: string) => {
    await toggleFavorite(username);
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
              {loadingLists ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 select-none border border-dashed border-border rounded-2xl bg-surface/40">
                  <span className="material-symbols-outlined text-[48px] text-text-muted">folder_open</span>
                  <p className="text-xs font-bold text-text-main">No custom lists created yet</p>
                  <p className="text-[10px] text-text-muted max-w-[260px]">Create custom audience lists above to group your subscribers and filter your mass broadcasts.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lists.map((list) => {
                    const isEditing = editingListId === list.id;
                    return (
                      <div key={list.id} className="bg-surface border border-border rounded-2xl p-4 space-y-4 transition-all shadow-sm">
                        <div className="flex justify-between items-center select-none">
                          <div>
                            <h3 className="text-sm font-black text-text-main">{list.name}</h3>
                            <p className="text-[10px] text-text-muted font-bold">
                              {list.usernames ? list.usernames.length : 0} {list.usernames?.length === 1 ? "member" : "members"}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingListId(isEditing ? null : list.id)}
                              className="text-xs font-bold text-primary border border-primary/20 bg-primary/5 hover:bg-primary hover:text-white px-4 py-1.5 rounded-full transition-all cursor-pointer"
                            >
                              {isEditing ? "Done" : "Manage Members"}
                            </button>
                            <button
                              onClick={() => handleDeleteList(list.id)}
                              className="h-8 w-8 rounded-full border border-border text-red-500 hover:bg-red-500/10 flex items-center justify-center cursor-pointer transition-colors"
                              title="Delete List"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Collapsible edit members section */}
                        {isEditing && (
                          <div className="border-t border-border pt-4 space-y-3 animate-fade-in">
                            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">List Members</h4>
                            
                            {!list.usernames || list.usernames.length === 0 ? (
                              <p className="text-xs text-text-muted">This list has no members yet.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {list.usernames.map((username: string) => {
                                  const creatorObj = creatorDirectory[username];
                                  return (
                                    <div key={username} className="bg-background border border-border/80 p-2.5 rounded-xl flex justify-between items-center gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <img
                                          src={creatorObj?.avatar || "/assets/be708ecefc41b969ee64c477f954168c.png"}
                                          alt={username}
                                          className="h-7 w-7 rounded-full object-cover border border-border"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-xs font-bold text-text-main truncate">
                                            {creatorObj?.name || username}
                                          </p>
                                          <p className="text-[9px] text-text-muted truncate">@{username}</p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveMember(list.id, username)}
                                        className="text-red-500 hover:text-red-600 text-[10px] font-bold cursor-pointer"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add member form section */}
                            <div className="bg-background/50 border border-border p-3 rounded-xl space-y-2">
                              <label className="block text-[9px] font-bold text-text-muted uppercase tracking-wider">
                                Add member from directory
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={memberUsernameToAdd[list.id] || ""}
                                  onChange={(e) => setMemberUsernameToAdd({
                                    ...memberUsernameToAdd,
                                    [list.id]: e.target.value
                                  })}
                                  className="flex-grow px-3 py-1.5 bg-background border border-border focus:border-primary rounded-lg text-xs font-semibold outline-none text-text-main"
                                >
                                  <option value="">-- Select user to add --</option>
                                  {Object.values(creatorDirectory)
                                    .filter(c => !list.usernames || !list.usernames.includes(c.username))
                                    .map(c => (
                                      <option key={c.username} value={c.username}>
                                        {c.name} (@{c.username})
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleAddMember(list.id)}
                                  disabled={!memberUsernameToAdd[list.id]}
                                  className="bg-primary text-white text-xs font-black px-4 rounded-lg hover:opacity-95 cursor-pointer disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  const creatorObj = creatorDirectory[username];
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
                  const creatorObj = creatorDirectory[username];
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
