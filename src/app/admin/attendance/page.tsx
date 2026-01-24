"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { formatDate, formatTime } from "@/lib/date";

interface Attendance {
  id: string;
  user_id: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  clock_in_time: string | null;
  clock_out_time: string | null;
  date: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function AdminAttendancePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 7))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "admin") {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  const fetchAttendances = async () => {
    try {
      setError("");
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(
        `https://api.stg.trywiguna.xyz/api/v1/attendance/admin/all?${params}`,
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
        setError("Failed to fetch attendance records");
      }
    } catch (err) {
      console.error("Error fetching attendances:", err);
      setError("Failed to fetch attendance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAttendances();
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://api.stg.trywiguna.xyz/api/v1/attendance/admin/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setAttendances(attendances.filter((a) => a.id !== id));
      } else {
        setError("Failed to delete attendance record");
      }
    } catch (err) {
      console.error("Error deleting attendance:", err);
      setError("Failed to delete attendance record");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Attendance</h1>

      <div className="flex gap-4 mb-6">
        <Button
          onClick={() => router.push("/admin/attendance/create")}
          className="bg-green-600 hover:bg-green-700"
        >
          Create Manual Attendance
        </Button>
        <Button
          onClick={() => router.push("/admin/attendance/backdate-requests")}
          className="bg-orange-600 hover:bg-orange-700"
        >
          Backdate Requests
        </Button>
        <Button
          onClick={() => router.push("/admin/attendance/time-off-requests")}
          className="bg-purple-600 hover:bg-purple-700"
        >
          Time Off Requests
        </Button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter</h2>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="late">Late</option>
            </select>
          </div>
          <Button
            onClick={fetchAttendances}
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
                  Employee
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
                  Actions
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
                      <div>
                        <p className="font-medium">
                          {record.user?.first_name} {record.user?.last_name}
                        </p>
                        <p className="text-gray-500 text-xs">{record.user?.email}</p>
                      </div>
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
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => router.push(`/admin/attendance/${record.id}/edit`)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
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
