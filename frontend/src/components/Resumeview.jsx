import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function ResumeView() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    async function loadResume() {
      const res = await fetch(`http://localhost:4000/api/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setResume(data.resume);
    }

    loadResume();
  }, [id]);

  async function downloadPDF() {
    const html = document.getElementById("resume-preview").outerHTML;

    const res = await fetch(`http://localhost:4000/api/resumes/${id}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ html }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${resume.title}.pdf`;
    a.click();

    URL.revokeObjectURL(url);
  }

  if (!resume) return <p>Loading...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>{resume.title}</h1>

      {/* 👇 Render your formatted resume here */}
      {/* Replace <pre> with your actual template layout */}
      <div
        id="resume-preview"
        style={{
          background: "white",
          padding: "40px",
          width: "800px",
          margin: "auto",
          border: "1px solid #eee",
        }}
      >
        <pre>{JSON.stringify(resume.sections, null, 2)}</pre>
      </div>

      <button
        onClick={downloadPDF}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          background: "#2563eb",
          color: "white",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
        }}
      >
        Download PDF
      </button>
    </div>
  );
}
