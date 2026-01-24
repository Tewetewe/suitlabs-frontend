"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { formatTime, formatDate } from "@/lib/date";

interface Attendance {
  id: string;
  user_id: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
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
      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://api.stg.trywiguna.xyz/api/v1/attendance/clock-in",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
        setSuccess("Clocked in successfully!");
      } else {
        setError("Failed to clock in");
      }
    } catch (err) {
      console.error("Error clocking in:", err);
      setError("Failed to clock in");
    }
  };

  const handleClockOut = async () => {
    try {
      setError("");
      setSuccess("");
      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://api.stg.trywiguna.xyz/api/v1/attendance/clock-out",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTodayAttendance(data);
        setSuccess("Clocked out successfully!");
      } else {
        setError("Failed to clock out");
      }
    } catch (err) {
      console.error("Error clocking out:", err);
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
        <h2 className="text-xl font-semibold mb-4">Today's Attendance</h2>

        {todayAttendance ? (
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Clock In Time:</p>
              <p className="text-lg font-semibold">
                {todayAttendance.clock_in_time
                  ? formatTime(todayAttendance.clock_in_time)
                  : "Not clocked in"}
              </p>
            </div>

            <div>
              <p className="text-gray-600">Clock Out Time:</p>
              <p className="text-lg font-semibold">
                {todayAttendance.clock_out_time
                  ? formatTime(todayAttendance.clock_out_time)
                  : "Not clocked out"}
              </p>
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

        <div className="flex gap-4 mt-6">
          <Button
            onClick={handleClockIn}
            disabled={todayAttendance?.clock_in_time !== null}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
          >
            Clock In
          </Button>
          <Button
            onClick={handleClockOut}
            disabled={!todayAttendance || todayAttendance.clock_out_time !== null}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          >
            Clock Out
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
      </div>
    </div>
  );
}
