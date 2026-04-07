import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { extractData } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ProfileCard from "../../components/profile/ProfileCard";
import EditProfileForm from "../../components/profile/EditProfileForm";
import ChangePasswordForm from "../../components/profile/ChangePasswordForm";

const resolveAssetBase = () => {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  return apiBase.replace(/\/api\/v1\/?$/, "");
};

const normalizeUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const buildFormFromProfile = (source) => ({
  name: source?.name || "",
  phone: source?.phone || "",
  linkedin_url: source?.linkedin_url || "",
  location: source?.location || "",
  bio: source?.bio || ""
});

const ProfilePage = () => {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    linkedin_url: "",
    location: "",
    bio: ""
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get("/users/me").then(extractData),
    staleTime: 2 * 60 * 1000
  });

  const profile = profileQuery.data ?? null;

  useEffect(() => {
    if (!profile) {
      return;
    }

    const nextForm = buildFormFromProfile(profile);
    setForm((current) => {
      const isSame = Object.keys(nextForm).every((key) => current[key] === nextForm[key]);
      return isSame ? current : nextForm;
    });
  }, [profile]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const updateMutation = useMutation({
    mutationFn: (payload) => api.patch("/users/me", payload).then(extractData),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      updateUser?.(data);
      setProfileSuccess("Profile updated successfully.");
      setProfileError("");
    },
    onError: (error) => {
      setProfileError(error.response?.data?.message || "Unable to update profile.");
      setProfileSuccess("");
    }
  });

  const avatarMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.patch("/users/me/avatar", formData);
      return extractData(response);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      updateUser?.(data);
      setProfileSuccess("Profile image updated successfully.");
      setProfileError("");
    },
    onError: (error) => {
      setProfileError(
        error?.response?.data?.message ||
        "Failed to upload profile image."
      );
      setProfileSuccess("");
    }
  });

  const passwordMutation = useMutation({
    mutationFn: (payload) => api.patch("/users/change-password", payload).then(extractData),
    onSuccess: () => {
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setPasswordSuccess("Password updated successfully.");
      setPasswordError("");
    },
    onError: (error) => {
      setPasswordError(error.response?.data?.message || "Unable to update password.");
      setPasswordSuccess("");
    }
  });

  const avatarUrl = useMemo(() => {
    if (!profile?.avatar_url) {
      return null;
    }

    if (profile.avatar_url.startsWith("http")) {
      return profile.avatar_url;
    }

    return `${resolveAssetBase()}${profile.avatar_url}`;
  }, [profile?.avatar_url]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = (event) => {
    event.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    updateMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim(),
      linkedin_url: normalizeUrl(form.linkedin_url),
      location: form.location.trim(),
      bio: form.bio.trim()
    });
  };

  const handleCancel = () => {
    setForm(buildFormFromProfile(profile));
    setProfileError("");
    setProfileSuccess("");
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate file type.
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG or WEBP images are allowed");
      return;
    }

    // Match backend avatar upload limit (2MB).
    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image must be smaller than 2MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setAvatarPreview(previewUrl);

    avatarMutation.mutate(file);
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Password confirmation does not match.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    passwordMutation.mutate(passwordForm);
  };

  if (profileQuery.isLoading) {
    return <p>Loading profile...</p>;
  }

  const profilePayload = profile || {};

  return (
    <div style={{ display: "grid", gap: "1.4rem" }}>
      <ProfileCard profile={profilePayload} avatarUrl={avatarPreview || avatarUrl} />

      <EditProfileForm
        form={form}
        onChange={handleProfileChange}
        onSubmit={handleProfileSubmit}
        onCancel={handleCancel}
        onAvatarChange={handleAvatarChange}
        isSaving={updateMutation.isPending || avatarMutation.isPending}
        avatarPreview={avatarPreview}
        avatarUrl={avatarUrl}
        error={profileError}
        success={profileSuccess}
      />

      <ChangePasswordForm
        form={passwordForm}
        onChange={handlePasswordChange}
        onSubmit={handlePasswordSubmit}
        isSaving={passwordMutation.isPending}
        error={passwordError}
        success={passwordSuccess}
      />
    </div>
  );
};

export default ProfilePage;
