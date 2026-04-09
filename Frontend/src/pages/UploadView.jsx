import { useState, useRef, useEffect } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { uploadDataset, getDatasetStatus } from "../api/client";
import ProgressBar from "../Components/ProgressBar";

export default function UploadView() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dataset, setDataset] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const pollRef = useRef(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setDataset(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setDataset(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await uploadDataset(file);
      setDataset({
        id: res.dataset_id,
        total_batches: res.total_batches,
        batches_processed: 0,
        status: "PENDING",
        percent_complete: 0,
      });

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const status = await getDatasetStatus(res.dataset_id);
          setDataset(status);
          if (status.status === "DONE" || status.status === "FAILED") {
            clearInterval(pollRef.current);
          }
        } catch {
          // Continue polling
        }
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setDataset(null);
    setError(null);
    if (pollRef.current) clearInterval(pollRef.current);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Data Ingestion</h1>
        <p className="page-subtitle">
          Upload transaction datasets for fraud detection processing
        </p>
      </div>

      {/* Upload Zone */}
      <div className="card" style={{ maxWidth: 640, marginBottom: 24 }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--accent-indigo)" : "var(--border-color)"}`,
            borderRadius: 10,
            padding: "48px 24px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            background: dragOver ? "rgba(99,102,241,0.05)" : "transparent",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <Upload
            size={40}
            style={{ margin: "0 auto 16px", color: "var(--accent-indigo)", opacity: 0.7 }}
          />
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
            {file ? file.name : "Drop your file here or click to browse"}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Supports CSV, JSON, and Excel (.xlsx) files
          </div>
        </div>

        {/* File info */}
        {file && !dataset && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 20,
              padding: "12px 16px",
              background: "var(--bg-input)",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <FileText size={18} style={{ color: "var(--accent-indigo)" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader size={16} className="animate-pulse" /> Processing...
                </>
              ) : (
                <>
                  <Upload size={16} /> Upload & Process
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="card animate-fade-in"
          style={{
            maxWidth: 640,
            borderColor: "var(--accent-red)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <AlertCircle size={20} style={{ color: "var(--accent-red)", flexShrink: 0 }} />
          <div style={{ color: "var(--accent-red)", fontSize: 14 }}>{error}</div>
        </div>
      )}

      {/* Processing Status */}
      {dataset && (
        <div className="card animate-fade-in" style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Pipeline Progress</h3>
            <span className={`badge badge-${dataset.status === "DONE" ? "resolved" : dataset.status === "FAILED" ? "blocked" : "pending"}`}>
              {dataset.status}
            </span>
          </div>

          <ProgressBar
            percent={dataset.percent_complete || 0}
            status={dataset.status}
            label="Overall Progress"
          />

          {/* Counters */}
          <div className="grid-3" style={{ marginTop: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-indigo-light)", fontFamily: "'JetBrains Mono', monospace" }}>
                {dataset.id}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Dataset ID</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-cyan)", fontFamily: "'JetBrains Mono', monospace" }}>
                {dataset.batches_processed}/{dataset.total_batches}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Batches</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                {dataset.status === "DONE" ? (
                  <CheckCircle size={28} style={{ color: "var(--accent-green)" }} />
                ) : dataset.status === "FAILED" ? (
                  <AlertCircle size={28} style={{ color: "var(--accent-red)" }} />
                ) : (
                  <Loader size={28} className="animate-pulse" style={{ color: "var(--accent-amber)" }} />
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Status</div>
            </div>
          </div>

          {(dataset.status === "DONE" || dataset.status === "FAILED") && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={resetUpload}>
                Upload Another File
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
