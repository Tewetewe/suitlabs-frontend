"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatTime } from "@/lib/date";
import { getLocation, isGeolocationSupported } from "@/lib/geolocation";
import { uploadImage, isCameraSupported } from "@/lib/camera";
import { isWithinOfficeLocation, getDistanceFromOffice } from "@/lib/location-distance";
import CameraModal from "@/components/modals/CameraModal";

interface Attendance {
  id: string;
  user_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_in_lat?: number | null;
  clock_in_lng?: number | null;
  clock_in_selfie_url?: string;
  clock_out_lat?: number | null;
  clock_out_lng?: number | null;
  clock_out_selfie_url?: string;
  date: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function StaffAttendancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [clockInLoading, setClockInLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<"clock-in" | "clock-out">(
    "clock-in"
  );
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [geolocationSupported] = useState(isGeolocationSupported());
  const [cameraSupported] = useState(isCameraSupported());
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pendingLocationData, setPendingLocationData] = useState<{
    lat: number | null;
    lng: number | null;
    distance: number | null;
    mode: "clock-in" | "clock-out";
  } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "staff" && user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchTodayAttendance = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://api.stg.trywiguna.xyz/api/v1/attendance/today",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 404) {
          // No attendance record for today
          setTodayAttendance(null);
        } else if (response.ok) {
          const data = await response.json();
          setTodayAttendance(data);
        } else {
          setError("Failed to fetch attendance data");
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
        setError("Failed to fetch attendance data");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTodayAttendance();
    }
  }, [user]);

  const handleClockIn = async () => {
    try {
      setError("");
      setSuccess("");
      setClockInLoading(true);

      let latitude: number | null = null;
      let longitude: number | null = null;
      let selfieURL = "";

      // Get location if supported
      if (geolocationSupported) {
        try {
          const location = await getLocation();
          latitude = location.latitude;
          longitude = location.longitude;

          // Check if far from office
          if (!isWithinOfficeLocation(latitude, longitude)) {
            const distance = getDistanceFromOffice(latitude, longitude);
            setPendingLocationData({
              lat: latitude,
              lng: longitude,
              distance,
              mode: "clock-in",
            });
            setNotesModalOpen(true);
            setClockInLoading(false);
            return;
          }
        } catch (err) {
          const error = err as Error;
          console.warn("Location capture failed:", error.message);
          setError(`Location: ${error.message}`);
        }
      }

      // If camera is supported but no image yet, open camera modal
      if (cameraSupported && !capturedImage) {
        setCameraMode("clock-in");
        setCameraModalOpen(true);
        setClockInLoading(false);
        return;
      }

      // If we have a captured image, upload it
      if (capturedImage) {
        try {
          const token = localStorage.getItem("token") || "";
          selfieURL = await uploadImage(capturedImage, token);
          setCapturedImage("");
        } catch (err) {
          const error = err as Error;
          console.warn("Image upload failed:", error.message);
          // Continue without image if upload fails
        }
      }

      await submitClockIn(latitude, longitude, selfieURL, "");
    } catch (err) {
      console.error("Error clocking in:", err);
      setError("Failed to clock in");
    } finally {
      setClockInLoading(false);
    }
  };

  const submitClockIn = async (
    lat: number | null,
    lng: number | null,
    selfieURL: string,
    additionalNotes: string
  ) => {
    const token = localStorage.getItem("token");
    const requestBody: Record<string, unknown> = {
      latitude: lat,
      longitude: lng,
      selfie_url: selfieURL,
      notes: additionalNotes,
    };

    const response = await fetch(
      "https://api.stg.trywiguna.xyz/api/v1/attendance/clock-in",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      const data = await response.json();
      setTodayAttendance(data);
      setSuccess("Clocked in successfully!");
    } else {
      setError("Failed to clock in");
    }
  };

  const handleClockOut = async () => {
    try {
      setError("");
      setSuccess("");
      setClockOutLoading(true);

      let latitude: number | null = null;
      let longitude: number | null = null;
      let selfieURL = "";

      // Get location if supported
      if (geolocationSupported) {
        try {
          const location = await getLocation();
          latitude = location.latitude;
          longitude = location.longitude;

          // Check if far from office
          if (!isWithinOfficeLocation(latitude, longitude)) {
            const distance = getDistanceFromOffice(latitude, longitude);
            setPendingLocationData({
              lat: latitude,
              lng: longitude,
              distance,
              mode: "clock-out",
            });
            setNotesModalOpen(true);
            setClockOutLoading(false);
            return;
          }
        } catch (err) {
          const error = err as Error;
          console.warn("Location capture failed:", error.message);
          setError(`Location: ${error.message}`);
        }
      }

      // If camera is supported but no image yet, open camera modal
      if (cameraSupported && !capturedImage) {
        setCameraMode("clock-out");
        setCameraModalOpen(true);
        setClockOutLoading(false);
        return;
      }

      // If we have a captured image, upload it
      if (capturedImage) {
        try {
          const token = localStorage.getItem("token") || "";
          selfieURL = await uploadImage(capturedImage, token);
          setCapturedImage("");
        } catch (err) {
          const error = err as Error;
          console.warn("Image upload failed:", error.message);
          // Continue without image if upload fails
        }
      }

      await submitClockOut(latitude, longitude, selfieURL, "");
    } catch (err) {
      console.error("Error clocking out:", err);
      setError("Failed to clock out");
    } finally {
      setClockOutLoading(false);
    }
  };

  const submitClockOut = async (
    lat: number | null,
    lng: number | null,
    selfieURL: string,
    additionalNotes: string
  ) => {
    const token = localStorage.getItem("token");
    const requestBody: Record<string, unknown> = {
      latitude: lat,
      longitude: lng,
      selfie_url: selfieURL,
      notes: additionalNotes,
    };

    const response = await fetch(
      "https://api.stg.trywiguna.xyz/api/v1/attendance/clock-out",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      const data = await response.json();
      setTodayAttendance(data);
      setSuccess("Clocked out successfully!");
    } else {
      setError("Failed to clock out");
    }
  };

  if (isLoading || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Attendance</h1>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-4 rounded mb-4">{success}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Today&apos;s Attendance</h2>

        {todayAttendance ? (
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Clock In Time:</p>
              <p className="text-lg font-semibold">
                {todayAttendance.clock_in_time
                  ? formatTime(todayAttendance.clock_in_time)
                  : "Not clocked in"}
              </p>
              {todayAttendance.clock_in_lat && todayAttendance.clock_in_lng && (
                <p className="text-sm text-gray-500 mt-1">
                  📍 Location: {todayAttendance.clock_in_lat.toFixed(4)}, {todayAttendance.clock_in_lng.toFixed(4)}
                </p>
              )}
              {todayAttendance.clock_in_selfie_url && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">📸 Selfie:</p>
                  <img
                    src={todayAttendance.clock_in_selfie_url}
                    alt="Clock in selfie"
                    className="w-24 h-24 rounded object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <p className="text-gray-600">Clock Out Time:</p>
              <p className="text-lg font-semibold">
                {todayAttendance.clock_out_time
                  ? formatTime(todayAttendance.clock_out_time)
                  : "Not clocked out"}
              </p>
              {todayAttendance.clock_out_lat && todayAttendance.clock_out_lng && (
                <p className="text-sm text-gray-500 mt-1">
                  📍 Location: {todayAttendance.clock_out_lat.toFixed(4)}, {todayAttendance.clock_out_lng.toFixed(4)}
                </p>
              )}
              {todayAttendance.clock_out_selfie_url && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">📸 Selfie:</p>
                  <img
                    src={todayAttendance.clock_out_selfie_url}
                    alt="Clock out selfie"
                    className="w-24 h-24 rounded object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <p className="text-gray-600">Status:</p>
              <p className="text-lg font-semibold capitalize">
                {todayAttendance.status}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No attendance record for today</p>
        )}

        <div className="flex gap-4 mt-6 flex-wrap">
          <Button
            onClick={handleClockIn}
            disabled={todayAttendance?.clock_in_time !== null || clockInLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            {clockInLoading ? "Processing..." : "Clock In"}
          </Button>
          <Button
            onClick={handleClockOut}
            disabled={!todayAttendance || todayAttendance.clock_out_time !== null || clockOutLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            {clockOutLoading ? "Processing..." : "Clock Out"}
          </Button>
          <Button
            onClick={() => router.push("/attendance/request-backdate")}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Request Backdate
          </Button>
          <Button
            onClick={() => router.push("/attendance/log")}
            className="bg-gray-600 hover:bg-gray-700"
          >
            View Log
          </Button>
          <Button
            onClick={() => router.push("/attendance/time-off")}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Time Off
          </Button>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Location & Photo Tracking:</strong> When you clock in/out, your location (GPS) and a selfie will be captured if your device supports it. This helps verify attendance authenticity.
          </p>
          {!geolocationSupported && (
            <p className="text-sm text-yellow-800 mt-2">⚠️ Your browser doesn&apos;t support geolocation.</p>
          )}
          {!cameraSupported && (
            <p className="text-sm text-yellow-800 mt-2">⚠️ Your browser doesn&apos;t support camera access.</p>
          )}
        </div>
      </div>

      <CameraModal
        isOpen={cameraModalOpen}
        onCapture={(imageData) => {
          setCapturedImage(imageData);
          // Continue with clock in/out after capturing
          if (cameraMode === "clock-in") {
            handleClockIn();
          } else {
            handleClockOut();
          }
        }}
        onClose={() => {
          setCameraModalOpen(false);
          setCapturedImage("");
        }}
        title={cameraMode === "clock-in" ? "Take Clock-In Selfie" : "Take Clock-Out Selfie"}
      />

      {/* Location Notes Modal */}
      {notesModalOpen && pendingLocationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-orange-600">
              ⚠️ Working Away From Office
            </h2>
            <p className="text-gray-700 mb-4">
              You are{" "}
              <strong>
                {pendingLocationData.distance?.toFixed(2)} km away
              </strong>{" "}
              from the office. Please provide notes explaining why you&apos;re clocking{" "}
              {pendingLocationData.mode === "clock-in" ? "in" : "out"} from a remote
              location.
            </p>
            <textarea
              className="w-full border border-gray-300 rounded p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Enter reason for remote clock-in/out (e.g., Client meeting, Working from home, etc.)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setNotesModalOpen(false);
                  setPendingLocationData(null);
                  setNotes("");
                  setClockInLoading(false);
                  setClockOutLoading(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!notes.trim()) {
                    setError("Please provide notes for remote clock-in/out");
                    return;
                  }

                  setNotesModalOpen(false);

                  if (pendingLocationData.mode === "clock-in") {
                    if (cameraSupported && !capturedImage) {
                      setCameraMode("clock-in");
                      setCameraModalOpen(true);
                    } else {
                      let selfieURL = "";
                      if (capturedImage) {
                        try {
                          const token = localStorage.getItem("token") || "";
                          selfieURL = await uploadImage(capturedImage, token);
                          setCapturedImage("");
                        } catch (err) {
                          const error = err as Error;
                          console.warn("Image upload failed:", error.message);
                        }
                      }
                      await submitClockIn(
                        pendingLocationData.lat,
                        pendingLocationData.lng,
                        selfieURL,
                        notes
                      );
                    }
                  } else {
                    if (cameraSupported && !capturedImage) {
                      setCameraMode("clock-out");
                      setCameraModalOpen(true);
                    } else {
                      let selfieURL = "";
                      if (capturedImage) {
                        try {
                          const token = localStorage.getItem("token") || "";
                          selfieURL = await uploadImage(capturedImage, token);
                          setCapturedImage("");
                        } catch (err) {
                          const error = err as Error;
                          console.warn("Image upload failed:", error.message);
                        }
                      }
                      await submitClockOut(
                        pendingLocationData.lat,
                        pendingLocationData.lng,
                        selfieURL,
                        notes
                      );
                    }
                  }

                  setPendingLocationData(null);
                  setNotes("");
                  setClockInLoading(false);
                  setClockOutLoading(false);
                }}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
