/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
  UserPlusIcon,
  KeyIcon,
  EnvelopeIcon,
  UserIcon,
  PhoneIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import {
  fetchPublicSettings,
  invalidatePublicSettingsCache,
} from "../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL;

const Register = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState("user");
  const [allowVendorSignup, setAllowVendorSignup] = useState(true);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [socialProviders, setSocialProviders] = useState({
    google: false,
    facebook: false,
  });
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const password = watch("password");

  useEffect(() => {
    let cancelled = false;

    const loadPublicSettings = async () => {
      const settings = await fetchPublicSettings({ force: true });
      if (cancelled) return;

      const marketplaceMode = String(settings?.marketplaceMode || "multi")
        .trim()
        .toLowerCase();
      const vendorEnabled = Boolean(settings?.vendorRegistrationEnabled);
      const allowVendor = marketplaceMode !== "single" && vendorEnabled;
      const initialSetupMode = Boolean(settings?.isInitialSetup);

      setAllowVendorSignup(allowVendor);
      setIsInitialSetup(initialSetupMode);
      setSocialProviders({
        google: Boolean(settings?.integrations?.enableGoogleLogin),
        facebook: Boolean(settings?.integrations?.enableFacebookLogin),
      });
      if (!allowVendor || initialSetupMode) {
        setAccountType("user");
      }
    };

    loadPublicSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);

    try {
      const resolvedAccountType = isInitialSetup ? "user" : accountType;
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        accountType: resolvedAccountType,
        vendorData:
          resolvedAccountType === "vendor"
            ? {
                storeName: data.storeName,
                description: data.storeDescription || "",
                city: data.storeCity || "",
                address: data.storeAddress || "",
              }
            : undefined,
      };

      const response = await axios.post(`${baseUrl}/auth/register`, payload);

      if (response?.data?.user?.adminSettings?.isSuperAdmin) {
        toast.success("Super Admin account created successfully.");
      } else {
        toast.success("Account created successfully.");
      }
      invalidatePublicSettingsCache();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to register. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startSocialLogin = (provider) => {
    const normalized = String(provider || "").toLowerCase();
    if (!["google", "facebook"].includes(normalized)) return;
    window.location.href = `${baseUrl}/auth/social/${normalized}`;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/")}
          className="mx-auto mb-6 flex items-center gap-2 px-4 py-2 text-xs font-semibold text-black rounded-xl border border-gray-200 hover:bg-gray-50"
        >
          <HomeIcon className="w-4 h-4" />
          Return Home
        </motion.button>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h1 className="text-3xl font-bold text-black text-center mb-2">
            Create Account
          </h1>
          <p className="text-sm text-gray-600 text-center mb-8">
            Fill in your details to get started
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {isInitialSetup ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">
                  Initial Setup: This registration will create the Super Admin account.
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Account type selection is disabled until setup is completed.
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-2 p-1 rounded-xl bg-gray-100 border border-gray-200 ${
                  allowVendorSignup ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setAccountType("user")}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    accountType === "user"
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Customer Account
                </button>
                {allowVendorSignup ? (
                  <button
                    type="button"
                    onClick={() => setAccountType("vendor")}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      accountType === "vendor"
                        ? "bg-black text-white"
                        : "text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Vendor Account
                  </button>
                ) : null}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  {...register("name", {
                    required: "Name is required",
                    minLength: {
                      value: 3,
                      message: "Name must be at least 3 characters",
                    },
                  })}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {accountType === "vendor" && !isInitialSetup && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name
                  </label>
                  <input
                    type="text"
                    {...register("storeName", {
                      required:
                        accountType === "vendor"
                          ? "Store name is required for vendor account"
                          : false,
                      minLength: {
                        value: 2,
                        message: "Store name must be at least 2 characters",
                      },
                    })}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                    placeholder="My Awesome Store"
                  />
                  {errors.storeName && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.storeName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Description (optional)
                  </label>
                  <textarea
                    rows={3}
                    {...register("storeDescription")}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                    placeholder="Tell customers about your store"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    {...register("storeCity")}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                    placeholder="Store city"
                  />
                  <input
                    type="text"
                    {...register("storeAddress")}
                    className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                    placeholder="Store address"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  })}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  {...register("phone", {
                    required: "Phone number is required",
                    validate: {
                      validBangladeshi: (value) => {
                        const clean = value.replace(/[^0-9]/g, "");
                        const normalized = clean.startsWith("880")
                          ? clean.slice(3)
                          : clean.startsWith("88")
                            ? clean.slice(2)
                            : clean.startsWith("0")
                              ? clean
                              : "0" + clean;
                        const regex = /^0[1-9][3-9]\d{8}$/;
                        return regex.test(normalized) || "Enter a valid phone number";
                      },
                    },
                  })}
                  className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                  placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  })}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 disabled:opacity-60"
            >
              {isLoading ? (
                "Creating Account..."
              ) : (
                <span className="inline-flex items-center justify-center">
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Create Account
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </span>
              )}
            </motion.button>

            {(socialProviders.google || socialProviders.facebook) && (
              <div className="space-y-2">
                {socialProviders.google && (
                  <button
                    type="button"
                    onClick={() => startSocialLogin("google")}
                    className="w-full py-3 border-2 border-gray-300 rounded-xl text-sm font-semibold text-black bg-white hover:bg-gray-50 hover:border-black transition-all duration-300"
                  >
                    Continue with Google
                  </button>
                )}
                {socialProviders.facebook && (
                  <button
                    type="button"
                    onClick={() => startSocialLogin("facebook")}
                    className="w-full py-3 border-2 border-gray-300 rounded-xl text-sm font-semibold text-black bg-white hover:bg-gray-50 hover:border-black transition-all duration-300"
                  >
                    Continue with Facebook
                  </button>
                )}
              </div>
            )}
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-black font-semibold hover:underline"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
