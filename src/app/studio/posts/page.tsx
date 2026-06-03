"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";

type CreatorPost = {
  id: string;
  content: string;
  media_urls?: string[];
  media_type?: string;
  is_premium: boolean;
  price: number;
  likes: number;
  comments_count: number;
  unlocks_count?: number;
  created_at: string;
  status: "published" | "hidden" | "archived" | string;
  visibility: "public" | "subscribers" | "private" | string;
};

const statusCopy: Record<string, string> = {
  published: "Published",
  hidden: "Hidden",
  archived: "Archived",
};

const visibilityCopy: Record<string, string> = {
  public: "Public",
  subscribers: "Subscribers",
  private: "Private",
};

export default function StudioPostsPage() {
  const { user, showToast } = useUser();
  const [posts, setPosts] = useState<CreatorPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [draftPrice, setDraftPrice] = useState("0");

  const totals = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        acc.published += post.status === "published" ? 1 : 0;
        acc.hidden += post.status === "hidden" ? 1 : 0;
        acc.archived += post.status === "archived" ? 1 : 0;
        acc.unlocks += post.unlocks_count || 0;
        return acc;
      },
      { published: 0, hidden: 0, archived: 0, unlocks: 0 },
    );
  }, [posts]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<CreatorPost[]>("/posts/mine?limit=50");
      setPosts(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const updatePost = async (postId: string, body: Record<string, unknown>) => {
    setSavingId(postId);
    try {
      await apiClient.put(`/posts/${postId}`, body);
      await loadPosts();
      showToast("Post updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update post");
    } finally {
      setSavingId(null);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("Delete this post permanently?")) return;
    setSavingId(postId);
    try {
      await apiClient.delete(`/posts/${postId}`);
      setPosts((current) => current.filter((post) => post.id !== postId));
      showToast("Post deleted");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to delete post");
    } finally {
      setSavingId(null);
    }
  };

  const beginEdit = (post: CreatorPost) => {
    setEditingId(post.id);
    setDraftContent(post.content || "");
    setDraftPrice(String(post.price || 0));
  };

  const saveEdit = async (post: CreatorPost) => {
    await updatePost(post.id, {
      content: draftContent,
      is_premium: post.is_premium,
      price: Number(draftPrice) || 0,
    });
    setEditingId(null);
  };

  if (user?.role !== "creator") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-black text-text-main">Creator access only</h1>
        <p className="mt-2 text-sm text-text-muted">Switch to a creator account to manage posts.</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Creator Studio</p>
          <h1 className="text-2xl font-black text-text-main">Manage Posts</h1>
        </div>
        <Link
          href="/create-post"
          className="rounded-full bg-primary px-4 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95"
        >
          New post
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Published", totals.published],
          ["Hidden", totals.hidden],
          ["Archived", totals.archived],
          ["Unlocks", totals.unlocks],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-bg-card px-3 py-3">
            <p className="text-[11px] font-bold text-text-muted">{label}</p>
            <p className="mt-1 text-xl font-black text-text-main">{value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-bg-card" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-sm font-bold text-text-main">No posts yet</p>
          <Link href="/create-post" className="mt-3 inline-block text-sm font-black text-primary">
            Create your first post
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isEditing = editingId === post.id;
            const busy = savingId === post.id;
            return (
              <article key={post.id} className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-bg-muted">
                    {post.media_type === "video" ? (
                      <video src={post.media_urls?.[0]} className="h-full w-full object-cover" muted playsInline />
                    ) : post.media_urls?.[0] ? (
                      <img src={post.media_urls[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-bold text-text-muted">Text</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">
                        {statusCopy[post.status] || post.status}
                      </span>
                      <span className="rounded-full bg-bg-muted px-2 py-1 text-[11px] font-bold text-text-muted">
                        {visibilityCopy[post.visibility] || post.visibility}
                      </span>
                      <span className="text-[11px] font-bold text-text-muted">
                        {new Date(post.created_at).toLocaleString()}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={draftContent}
                          onChange={(event) => setDraftContent(event.target.value)}
                          className="min-h-24 w-full rounded-md border border-border bg-bg-main p-3 text-sm text-text-main outline-none focus:border-primary"
                        />
                        <label className="flex max-w-44 items-center gap-2 text-xs font-bold text-text-muted">
                          Rs
                          <input
                            value={draftPrice}
                            onChange={(event) => setDraftPrice(event.target.value)}
                            inputMode="decimal"
                            className="w-full rounded-md border border-border bg-bg-main px-2 py-1 text-sm text-text-main outline-none focus:border-primary"
                          />
                        </label>
                      </div>
                    ) : (
                      <p className="text-sm font-medium leading-6 text-text-main">{post.content || "No caption"}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-text-muted">
                      <span>{post.likes} likes</span>
                      <span>{post.comments_count} comments</span>
                      <span>{post.unlocks_count || 0} unlocks</span>
                      <span>{post.is_premium ? `Paid Rs ${post.price}` : "Free"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(post)} disabled={busy} className="rounded-full bg-primary px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="rounded-full bg-bg-muted px-3 py-1.5 text-xs font-black text-text-main">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => beginEdit(post)} className="rounded-full bg-bg-muted px-3 py-1.5 text-xs font-black text-text-main">
                      Edit
                    </button>
                  )}

                  <select
                    value={post.visibility}
                    onChange={(event) => updatePost(post.id, { visibility: event.target.value })}
                    disabled={busy}
                    className="rounded-full border border-border bg-bg-main px-3 py-1.5 text-xs font-black text-text-main"
                  >
                    <option value="public">Public</option>
                    <option value="subscribers">Subscribers</option>
                    <option value="private">Private</option>
                  </select>

                  <button onClick={() => updatePost(post.id, { status: "published" })} disabled={busy} className="rounded-full bg-bg-muted px-3 py-1.5 text-xs font-black text-text-main">
                    Publish
                  </button>
                  <button onClick={() => updatePost(post.id, { status: "hidden" })} disabled={busy} className="rounded-full bg-bg-muted px-3 py-1.5 text-xs font-black text-text-main">
                    Hide
                  </button>
                  <button onClick={() => updatePost(post.id, { status: "archived" })} disabled={busy} className="rounded-full bg-bg-muted px-3 py-1.5 text-xs font-black text-text-main">
                    Archive
                  </button>
                  <button onClick={() => deletePost(post.id)} disabled={busy} className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-black text-red-600 disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
