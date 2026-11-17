"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Camera QR scanner (html5-qrcode). Loaded lazily; falls back gracefully when no camera/permission. */
export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const cb = useRef(onScan);
  useEffect(() => {
    cb.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("gate-qr-reader");
        ref.current = scanner;
        let last = "";
        let lastAt = 0;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            const now = Date.now();
            if (text === last && now - lastAt < 3000) return;
            last = text;
            lastAt = now;
            cb.current(text);
          },
          () => {},
        );
      } catch (e) {
        setError((e as Error)?.message || "Camera not available. Use the student ID box instead.");
        setOn(false);
      }
    })();
    return () => {
      cancelled = true;
      const s = ref.current;
      ref.current = null;
      s?.stop().then(() => s.clear()).catch(() => {});
    };
  }, [on]);

  return (
    <div className="space-y-2">
      <div id="gate-qr-reader" className={on ? "overflow-hidden rounded-xl border" : "hidden"} />
      <Button variant={on ? "outline" : "default"} className="h-11 w-full" onClick={() => { setError(null); setOn((v) => !v); }}>
        {on ? <><CameraOff /> Stop camera</> : <><Camera /> Scan ID card with camera</>}
      </Button>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
