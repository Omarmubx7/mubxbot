import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0A1120 0%, #0D1B3B 55%, #132E67 100%)",
          color: "#ffffff",
          position: "relative",
          fontFamily: "Inter, Segoe UI, Arial, sans-serif",
          padding: 56,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 15% 20%, rgba(10, 132, 255, 0.35), transparent 40%), radial-gradient(circle at 82% 75%, rgba(88, 86, 214, 0.35), transparent 42%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            borderRadius: 36,
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(10px)",
            padding: 48,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0A84FF 0%, #5856D6 100%)",
                fontSize: 34,
                fontWeight: 700,
              }}
            >
              M
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1 }}>
                MUBXBot
              </div>
              <div style={{ fontSize: 24, opacity: 0.86 }}>
                HTU School of Computing
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              <div>Find instructors, departments,</div>
              <div>office locations, and hours.</div>
            </div>
            <div style={{ fontSize: 22, opacity: 0.85 }}>
              Official HTU assistant experience.
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}