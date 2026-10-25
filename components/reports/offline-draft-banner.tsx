"use client";

import * as React from "react";
import { Wifi, WifiOff, Save, Trash2, RotateCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OfflineDraft, getAllOfflineDrafts, deleteOfflineDraft } from "@/lib/storage/offline-drafts";

interface OfflineDraftBannerProps {
  onLoadDraft?: (draft: OfflineDraft) => void;
}

export function OfflineDraftBanner({ onLoadDraft }: OfflineDraftBannerProps) {
  const [isOnline, setIsOnline] = React.useState(true);
  const [drafts, setDrafts] = React.useState<OfflineDraft[]>([]);
  const [showDrawer, setShowDrawer] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Load existing drafts
      getAllOfflineDrafts().then(setDrafts);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleDelete = async (id: string) => {
    await deleteOfflineDraft(id);
    const updated = await getAllOfflineDrafts();
    setDrafts(updated);
  };

  if (isOnline && drafts.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-[#cbd5cb] bg-white p-3 text-xs shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <Wifi className="h-4 w-4" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <WifiOff className="h-4 w-4" /> Offline Mode (PWA)
            </span>
          )}
          <span className="text-[#5c6f66]">
            {!isOnline
              ? "Drafts are safely preserved in browser local storage until connectivity returns."
              : `${drafts.length} saved local draft(s) available.`}
          </span>
        </div>

        {drafts.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDrawer(!showDrawer)}
            className="h-7 text-xs border-[#cbd5cb] text-[#0e2b24]"
          >
            {showDrawer ? "Hide Drafts" : `View Saved Drafts (${drafts.length})`}
          </Button>
        )}
      </div>

      {showDrawer && drafts.length > 0 && (
        <div className="pt-2 border-t border-[#eef1e9] space-y-2">
          {drafts.map((d) => (
            <div
              key={d.localId}
              className="flex items-center justify-between p-2 rounded-lg bg-[#faf9f5] border border-[#cbd5cb]"
            >
              <div>
                <span className="font-semibold text-[#0e2b24] block">
                  {d.category} · {d.locationName}
                </span>
                <span className="text-[11px] text-[#5c6f66]">
                  {d.photos.length} photo(s) · Last edited:{" "}
                  {new Date(d.updatedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {onLoadDraft && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onLoadDraft(d)}
                    className="h-7 text-[11px] bg-white border-[#cbd5cb]"
                  >
                    Load Draft
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(d.localId)}
                  className="h-7 text-rose-700 hover:bg-rose-50"
                  title="Delete draft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
