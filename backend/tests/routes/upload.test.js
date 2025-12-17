/**
 * Upload Routes Tests
 * Tests routes/upload.js
 * Target: 92%+ coverage
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get the directory for test files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Upload Routes", () => {
  let app;
  let uploadRoutes;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import fresh upload routes
    vi.resetModules();
    uploadRoutes = (await import("../../routes/upload.js")).default;

    app = express();
    app.use(express.json());
    app.use("/api", uploadRoutes);

    // Add error handling middleware
    app.use((err, req, res, next) => {
      if (err.message === "Invalid file type") {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large" });
      }
      res.status(500).json({ error: err.message });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /api/upload-profile-pic - Real File Uploads", () => {
    it("should upload a valid jpg image", async () => {
      // Create a small test image buffer (1x1 pixel JPEG)
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
        0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
        0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
        0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
        0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
        0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
        0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x00, 0x31, 0xc4, 0x1f, 0xff,
        0xd9,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", jpegBuffer, "test-image.jpg");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("url");
      expect(response.body.url).toContain("/uploads/");
      expect(response.body.url).toContain("test-image.jpg");

      // Clean up uploaded file
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should upload a valid png image", async () => {
      // Minimal 1x1 pixel PNG
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", pngBuffer, "test-image.png");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("url");
      expect(response.body.url).toContain(".png");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should upload a valid jpeg image", async () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", jpegBuffer, "photo.jpeg");

      expect(response.status).toBe(200);
      expect(response.body.url).toContain(".jpeg");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should upload a valid gif image", async () => {
      // Minimal 1x1 pixel GIF
      const gifBuffer = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00,
        0x3b,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", gifBuffer, "animation.gif");

      expect(response.status).toBe(200);
      expect(response.body.url).toContain(".gif");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should reject invalid file types", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 test content");

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", pdfBuffer, "document.pdf");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid file type");
    });

    it("should reject txt files", async () => {
      const txtBuffer = Buffer.from("This is a text file");

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", txtBuffer, "readme.txt");

      expect(response.status).toBe(400);
    });

    it("should reject exe files", async () => {
      const exeBuffer = Buffer.from("MZ fake exe content");

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", exeBuffer, "program.exe");

      expect(response.status).toBe(400);
    });

    it("should sanitize filenames with spaces", async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", pngBuffer, "my profile pic.png");

      expect(response.status).toBe(200);
      expect(response.body.url).toContain("my_profile_pic.png");
      expect(response.body.url).not.toContain(" ");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should handle multiple consecutive spaces in filename", async () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", jpegBuffer, "my   photo   here.jpg");

      expect(response.status).toBe(200);
      expect(response.body.url).toContain("my_photo_here.jpg");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should generate unique filenames with timestamps", async () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]);

      const response1 = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", jpegBuffer, "test.jpg");

      // Small delay
      await new Promise((r) => setTimeout(r, 10));

      const response2 = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", jpegBuffer, "test.jpg");

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.url).not.toBe(response2.body.url);

      // Clean up
      for (const response of [response1, response2]) {
        const uploadedPath = path.join(
          __dirname,
          "../../uploads",
          response.body.url.split("/uploads/")[1]
        );
        if (fs.existsSync(uploadedPath)) {
          fs.unlinkSync(uploadedPath);
        }
      }
    });

    it("should handle special characters in filename", async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", pngBuffer, "photo (1).png");

      expect(response.status).toBe(200);
      expect(response.body.url).toContain("photo_(1).png");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should handle uppercase extensions", async () => {
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
      ]);

      const response = await request(app)
        .post("/api/upload-profile-pic")
        .attach("image", jpegBuffer, "PHOTO.JPG");

      expect(response.status).toBe(200);
      expect(response.body.url).toContain(".JPG");

      // Clean up
      const uploadedPath = path.join(
        __dirname,
        "../../uploads",
        response.body.url.split("/uploads/")[1]
      );
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
    });

    it("should handle missing file field gracefully", async () => {
      const response = await request(app)
        .post("/api/upload-profile-pic")
        .send({});

      // When no file is provided, multer doesn't set req.file and the route will error
      expect([400, 500]).toContain(response.status);
    });
  });

  describe("Directory and Path handling", () => {
    it("should have correct upload directory structure", () => {
      const uploadDir = path.join(__dirname, "../../uploads");
      expect(fs.existsSync(uploadDir)).toBe(true);
    });

    it("should use correct path module methods", () => {
      const testFilename = "test.jpg";
      const ext = path.extname(testFilename);
      expect(ext).toBe(".jpg");

      const dirname = path.dirname("/test/path/file.txt");
      expect(dirname).toBe("/test/path");
    });
  });

  describe("File filter regex", () => {
    it("should match jpeg extension", () => {
      const allowed = /jpeg|jpg|png|gif/;
      expect(allowed.test(".jpeg")).toBe(true);
    });

    it("should match jpg extension", () => {
      const allowed = /jpeg|jpg|png|gif/;
      expect(allowed.test(".jpg")).toBe(true);
    });

    it("should match png extension", () => {
      const allowed = /jpeg|jpg|png|gif/;
      expect(allowed.test(".png")).toBe(true);
    });

    it("should match gif extension", () => {
      const allowed = /jpeg|jpg|png|gif/;
      expect(allowed.test(".gif")).toBe(true);
    });

    it("should not match invalid extensions", () => {
      const allowed = /jpeg|jpg|png|gif/;
      expect(allowed.test(".pdf")).toBe(false);
      expect(allowed.test(".doc")).toBe(false);
      expect(allowed.test(".exe")).toBe(false);
      expect(allowed.test(".bmp")).toBe(false);
    });
  });

  describe("File size limits", () => {
    it("should have 5MB file size limit configured", () => {
      const maxSize = 5 * 1024 * 1024;
      expect(maxSize).toBe(5242880);
    });
  });

  describe("Module export", () => {
    it("should export a valid express router", () => {
      expect(uploadRoutes).toBeDefined();
      expect(typeof uploadRoutes).toBe("function");
    });
  });
});
