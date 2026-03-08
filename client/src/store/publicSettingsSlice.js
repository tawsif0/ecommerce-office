import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import {
  broadcastPublicSettingsUpdated,
  fetchPublicSettings,
  getDefaultPublicSettings,
  normalizePublicSettingsPayload,
  primePublicSettingsCache,
} from "../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const initialSettings = getDefaultPublicSettings();

export const loadPublicSettings = createAsyncThunk(
  "publicSettings/loadPublicSettings",
  async ({ force = false } = {}, { rejectWithValue }) => {
    try {
      return await fetchPublicSettings({ force });
    } catch (error) {
      return rejectWithValue(error?.message || "Failed to load public settings");
    }
  },
);

export const loadAdminSettings = createAsyncThunk(
  "publicSettings/loadAdminSettings",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${baseUrl}/auth/admin/settings`, {
        headers: getAuthHeaders(),
      });
      return normalizePublicSettingsPayload(response.data || {});
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.error || "Failed to load website settings",
      );
    }
  },
);

export const saveAdminSettings = createAsyncThunk(
  "publicSettings/saveAdminSettings",
  async (payload, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${baseUrl}/auth/admin/settings`, payload, {
        headers: getAuthHeaders(),
      });
      const normalized = normalizePublicSettingsPayload(response?.data?.settings || payload);
      primePublicSettingsCache(normalized);
      broadcastPublicSettingsUpdated();
      return {
        settings: normalized,
        message: response?.data?.message || "Settings saved",
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.error || "Failed to save settings");
    }
  },
);

export const uploadAdminLogo = createAsyncThunk(
  "publicSettings/uploadAdminLogo",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const response = await axios.post(`${baseUrl}/auth/admin/settings/logo-upload`, formData, {
        headers: getAuthHeaders(),
      });
      const logoUrl = String(response?.data?.logoUrl || "").trim();
      const refreshed = normalizePublicSettingsPayload(await fetchPublicSettings({ force: true }));
      const mergedSettings = {
        ...refreshed,
        website: {
          ...(refreshed?.website || {}),
          logoMode: "image",
          logoUrl: logoUrl || refreshed?.website?.logoUrl || "",
        },
      };
      primePublicSettingsCache(mergedSettings);
      broadcastPublicSettingsUpdated();
      return {
        logoUrl,
        settings: mergedSettings,
        message: response?.data?.message || "Logo uploaded",
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.error || "Failed to upload logo");
    }
  },
);

const publicSettingsSlice = createSlice({
  name: "publicSettings",
  initialState: {
    settings: initialSettings,
    status: "idle",
    error: "",
    loaded: false,
    adminDraft: initialSettings,
    adminStatus: "idle",
    adminError: "",
    saveStatus: "idle",
    saveError: "",
    logoUploadStatus: "idle",
    logoUploadError: "",
  },
  reducers: {
    setAdminSettingsDraft(state, action) {
      state.adminDraft = normalizePublicSettingsPayload(action.payload || {});
    },
    updateAdminNestedField(state, action) {
      const { section, key, value } = action.payload || {};
      if (!section || !key) return;
      state.adminDraft = {
        ...state.adminDraft,
        [section]: {
          ...(state.adminDraft?.[section] || {}),
          [key]: value,
        },
      };
    },
    setMarketplaceMode(state, action) {
      const nextMode =
        String(action.payload || "").trim().toLowerCase() === "single" ? "single" : "multi";
      state.adminDraft.marketplaceMode = nextMode;
      if (nextMode === "single") {
        state.adminDraft.vendorRegistrationEnabled = false;
      }
      state.adminDraft.marketplace = {
        ...(state.adminDraft.marketplace || {}),
        marketplaceMode: nextMode,
        vendorRegistrationEnabled:
          nextMode === "single"
            ? false
            : Boolean(state.adminDraft?.vendorRegistrationEnabled),
        publicStockSummaryEnabled: Boolean(state.adminDraft?.publicStockSummaryEnabled),
      };
    },
    setVendorRegistrationEnabled(state, action) {
      if (String(state.adminDraft?.marketplaceMode || "multi") === "single") {
        state.adminDraft.vendorRegistrationEnabled = false;
        state.adminDraft.marketplace = {
          ...(state.adminDraft.marketplace || {}),
          marketplaceMode: "single",
          vendorRegistrationEnabled: false,
          publicStockSummaryEnabled: Boolean(
            state.adminDraft?.publicStockSummaryEnabled,
          ),
        };
        return;
      }
      state.adminDraft.vendorRegistrationEnabled = Boolean(action.payload);
      state.adminDraft.marketplace = {
        ...(state.adminDraft.marketplace || {}),
        marketplaceMode: String(state.adminDraft?.marketplaceMode || "multi"),
        vendorRegistrationEnabled: Boolean(action.payload),
        publicStockSummaryEnabled: Boolean(state.adminDraft?.publicStockSummaryEnabled),
      };
    },
    setPublicStockSummaryEnabled(state, action) {
      const enabled = Boolean(action.payload);
      state.adminDraft.publicStockSummaryEnabled = enabled;
      state.adminDraft.marketplace = {
        ...(state.adminDraft.marketplace || {}),
        marketplaceMode: String(state.adminDraft?.marketplaceMode || "multi"),
        vendorRegistrationEnabled: Boolean(state.adminDraft?.vendorRegistrationEnabled),
        publicStockSummaryEnabled: enabled,
      };
    },
    mergePublicSettingsState(state, action) {
      state.settings = normalizePublicSettingsPayload(action.payload || {});
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPublicSettings.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(loadPublicSettings.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = "";
        state.loaded = true;
        state.settings = normalizePublicSettingsPayload(action.payload || {});
      })
      .addCase(loadPublicSettings.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload || action.error?.message || "");
      })
      .addCase(loadAdminSettings.pending, (state) => {
        state.adminStatus = "loading";
        state.adminError = "";
      })
      .addCase(loadAdminSettings.fulfilled, (state, action) => {
        const normalized = normalizePublicSettingsPayload(action.payload || {});
        state.adminStatus = "succeeded";
        state.adminError = "";
        state.adminDraft = normalized;
        state.settings = normalized;
        state.loaded = true;
      })
      .addCase(loadAdminSettings.rejected, (state, action) => {
        state.adminStatus = "failed";
        state.adminError = String(action.payload || action.error?.message || "");
      })
      .addCase(saveAdminSettings.pending, (state) => {
        state.saveStatus = "loading";
        state.saveError = "";
      })
      .addCase(saveAdminSettings.fulfilled, (state, action) => {
        const normalized = normalizePublicSettingsPayload(action.payload?.settings || {});
        state.saveStatus = "succeeded";
        state.saveError = "";
        state.settings = normalized;
        state.adminDraft = normalized;
        state.loaded = true;
      })
      .addCase(saveAdminSettings.rejected, (state, action) => {
        state.saveStatus = "failed";
        state.saveError = String(action.payload || action.error?.message || "");
      })
      .addCase(uploadAdminLogo.pending, (state) => {
        state.logoUploadStatus = "loading";
        state.logoUploadError = "";
      })
      .addCase(uploadAdminLogo.fulfilled, (state, action) => {
        const normalized = normalizePublicSettingsPayload(action.payload?.settings || {});
        state.logoUploadStatus = "succeeded";
        state.logoUploadError = "";
        state.settings = normalized;
        state.adminDraft = normalized;
        state.loaded = true;
      })
      .addCase(uploadAdminLogo.rejected, (state, action) => {
        state.logoUploadStatus = "failed";
        state.logoUploadError = String(action.payload || action.error?.message || "");
      });
  },
});

export const {
  setAdminSettingsDraft,
  updateAdminNestedField,
  setMarketplaceMode,
  setPublicStockSummaryEnabled,
  setVendorRegistrationEnabled,
  mergePublicSettingsState,
} = publicSettingsSlice.actions;

export const selectPublicSettingsState = (state) => state.publicSettings;
export const selectPublicSettings = (state) => state.publicSettings.settings;
export const selectAdminSettingsDraft = (state) => state.publicSettings.adminDraft;

export default publicSettingsSlice.reducer;
