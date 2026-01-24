"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/date";

interface AttendanceRecord {
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

export default function AttendanceLogPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "staff" && user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  const fetchLog = async () => {
    try {
      setError("");
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      const response = await fetch(
        `https://api.stg.trywiguna.xyz/api/v1/attendance/log?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAttendances(Array.isArray(data) ? data : []);
      } else {
        setError("Failed to fetch attendance log");
      }
    } catch (err) {
      console.error("Error fetching log:", err);
      setError("Failed to fetch attendance log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLog();
    }
  }, [user]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Attendance Log</h1>

      <Button
        onClick={() => router.push("/attendance")}
        className="mb-6 bg-gray-600 hover:bg-gray-700"
      >
        ← Back to Attendance
      </Button>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter by Date Range</h2>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>
          <Button
            onClick={fetchLog}
            className="self-end bg-blue-600 hover:bg-blue-700"
          >
            Search
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Clock In
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Clock Out
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {attendances.length > 0 ? (
                attendances.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.clock_in_time ? formatTime(record.clock_in_time) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.clock_out_time ? formatTime(record.clock_out_time) : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-white text-xs font-semibold ${
                          record.status === "present"
                            ? "bg-green-600"
                            : record.status === "absent"
                              ? "bg-red-600"
                              : record.status === "leave"
                                ? "bg-yellow-600"
                                : "bg-orange-600"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {record.notes}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
