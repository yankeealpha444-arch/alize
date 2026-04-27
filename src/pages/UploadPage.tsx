// AI SAFE FILE
// UI LOCKED
// DO NOT MODIFY LAYOUT, STYLE, STRUCTURE, ROUTES, COPY, OR TEMPLATE
// ONLY FIX THE SPECIFIC REQUESTED LOGIC
// UI changes require: "UI change approved"

import { useState, type CSSProperties } from "react";

type Props = {
  onUploadComplete?: (data: any) => void;
};

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: "100vh",
    padding: "4rem 1rem",
    maxWidth: "36rem",
    margin: "0 auto",
  },
  title: {
    fontSize: "1.875rem",
    fontWeight: 700,
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#666",
    marginBottom: "1.5rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    marginBottom: "1rem",
    border: "1px solid #ccc",
    borderRadius: "0.5rem",
    boxSizing: "border-box",
  },
  fileInput: {
    marginBottom: "1rem",
  },
  fileName: {
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  button: {
    padding: "0.625rem 1.5rem",
    borderRadius: "9999px",
    background: "#111",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  },
};

export default function UploadPage({ onUploadComplete }: Props) {
  const [link, setLink] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleComplete = onUploadComplete || (() => {});

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        Turn your video into clips that get views
      </h1>

      <p style={styles.subtitle}>
        Paste a YouTube or TikTok link, or upload a file
      </p>

      {/* LINK INPUT */}
      <input
        type="text"
        placeholder="Paste YouTube or TikTok link..."
        value={link}
        onChange={(e) => setLink(e.target.value)}
        style={styles.input}
      />

      {/* FILE UPLOAD */}
      <input
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setFileName(file.name);
          }
        }}
        style={styles.fileInput}
      />

      {fileName && (
        <p style={styles.fileName}>Uploaded: {fileName}</p>
      )}

      {/* BUTTON */}
      <button
        type="button"
        style={styles.button}
        onClick={() => handleComplete({ link, fileName })}
      >
        Get my clips
      </button>
    </div>
  );
}
