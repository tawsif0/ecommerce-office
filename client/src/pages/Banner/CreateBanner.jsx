/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";
import { FiImage, FiUpload, FiType, FiFileText, FiX } from "react-icons/fi";

const CreateBanner = () => {
  const baseUrl = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [thumbFile, setThumbFile] = useState(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
  });

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }
  }, []);

  const compressImage = (file, options = {}) => {
    const {
      maxWidth = 1600,
      maxHeight = 900,
      quality = 0.85,
      mimeType = "image/jpeg",
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio, 1);

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Image compression failed"));
            const compressedFile = new File([blob], file.name, {
              type: blob.type,
            });
            resolve(compressedFile);
          },
          mimeType,
          quality,
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load failed"));
      };
      img.src = url;
    });
  };

  // Handle image upload
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, WebP, GIF allowed.");
      return;
    }

    try {
      const [compressed, thumb] = await Promise.all([
        compressImage(file, {
          maxWidth: 1600,
          maxHeight: 900,
          quality: 0.85,
          mimeType: "image/jpeg",
        }),
        compressImage(file, {
          maxWidth: 800,
          maxHeight: 450,
          quality: 0.7,
          mimeType: "image/jpeg",
        }),
      ]);

      setImageFile(compressed);
      setThumbFile(thumb);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      toast.error("Failed to process image. Please try another.");
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setThumbFile(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    const toastId = toast.loading("Creating banner...");

    try {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required. Please login again.", {
          id: toastId,
        });
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();

      // Append form data
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("isActive", "true");

      // Append image if exists
      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (thumbFile) {
        formData.append("thumb", thumbFile);
      }

      const response = await axios.post(`${baseUrl}/banners`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Banner created successfully!", { id: toastId });

        // Reset form
        setForm({
          title: "",
          description: "",
        });
        setImageFile(null);
        setImagePreview("");
        setThumbFile(null);

        // Dispatch event for other components
        window.dispatchEvent(
          new CustomEvent("bannerCreated", {
            detail: response.data.banner,
          })
        );
      }
    } catch (err) {
      let errorMessage = "Failed to create banner";

      if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (err.response?.status === 413) {
        errorMessage = "Image upload failed (file too large)";
      } else if (err.response?.status === 415) {
        errorMessage = "Unsupported file type";
      } else if (err.response?.data?.message) {
        errorMessage = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-2 border-t-black rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="w-full mx-auto p-2 md:p-4">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-center">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 text-center">
                Create New Banner
              </h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base text-center">
                Add a new banner to your store.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            {/* Left Column - Form */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
              >
                <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                  <FiType className="mr-2" /> Banner Information
                </h2>

                <div className="space-y-4 md:space-y-6">
                  {/* Title */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <FiType className="mr-2" /> Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Enter banner title"
                      className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300  focus:border-gray-500 transition-all text-sm md:text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Title will be displayed if provided
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <FiFileText className="mr-2" /> Description
                    </label>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300  focus:border-gray-500 transition-all text-sm md:text-base"
                      placeholder="Enter banner description"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Description will be displayed if provided
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Image */}
            <div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
              >
                <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
                  <FiImage className="mr-2" /> Banner Image
                </h2>

                {/* Image Upload Area */}
                <div className="mb-3 md:mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 md:p-6 text-center hover:border-gray-500 transition-colors">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Banner preview"
                          className="w-full h-48 md:h-64 object-contain rounded-lg mx-auto"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                        >
                          <FiX size={14} />
                        </button>
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          Banner Image Preview
                        </div>
                      </div>
                    ) : (
                      <>
                        <FiImage className="mx-auto text-gray-400 text-2xl md:text-3xl mb-2" />
                        <p className="text-gray-600 mb-2 text-sm md:text-base">
                          Click to upload banner image
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="banner-image-upload"
                        />
                        <label
                          htmlFor="banner-image-upload"
                          className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-600 text-white rounded-lg cursor-pointer hover:bg-gray-700 transition-colors text-sm md:text-base"
                        >
                          <FiUpload /> Upload Image
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          JPG, PNG, WebP, GIF (auto-optimized on upload)
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full mt-4 md:mt-6 py-2 md:py-3 px-3 md:px-4 rounded-lg font-medium text-white ${
                    isSubmitting
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gray-900 hover:bg-gray-800"
                  } transition-all shadow-sm md:shadow-md flex items-center justify-center text-sm md:text-base`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Banner...
                    </>
                  ) : (
                    "Create Banner"
                  )}
                </motion.button>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default CreateBanner;
